import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  diffIgMedia,
  parseIgMediaResponse,
  type ParsedIgMedia,
} from "../../../lib/domain/ig-media";
import { nextSyncState, type SyncState } from "../../../lib/domain/sync";
import { escapeHtml, sendEmail } from "../../../lib/notifications/email";
import type { Database } from "../../../lib/db/types";
import type { CronEnv } from "./env";

/*
 * Instagram Graph API → ig_media, hourly. Same shape as sync-ics.ts on purpose
 * (PLAN.md §5: "same cron worker", "Phase 4's Instagram sync reuses" sync_state)
 * — one mental model for "how does a sync job behave here" covers both.
 *
 *   fetch latest 25 posts ──▶ looks like the media list? ──no──▶ record failure,
 *        │                                                        KEEP the cache
 *        yes                                                      (3rd in a row:
 *        ▼                                                          email baker)
 *   UPSERT by ig_media_id ──▶ then DELETE the ones that fell out of the latest 25
 *        │                    (upsert-first: a half-finished run keeps stale
 *        ▼                     posts visible rather than blanking the gallery)
 *   record success, clear the failure streak
 *
 * `is_hidden` is never touched by the sync — it's the baker's call, made once in
 * settings, and a re-sync of the same post must not silently un-hide it.
 */

const JOB = "instagram";
const GRAPH_API_VERSION = "v25.0";
const FETCH_TIMEOUT_MS = 15_000;
const MEDIA_FIELDS = "id,caption,media_type,media_url,permalink,timestamp,thumbnail_url";

export type IgSyncResult =
  | { status: "skipped"; reason: string }
  | { status: "ok"; synced: number; added: number; removed: number }
  | { status: "failed"; error: string; alerted: boolean };

export async function syncIg(env: CronEnv): Promise<IgSyncResult> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return { status: "skipped", reason: "Supabase binding not configured" };
  }
  const supabase = createClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // No IG account connected yet is a legitimate pre-launch state, not an
  // outage — mirrors sync-ics.ts's handling of a missing BAKERY_ICS_URL.
  if (!env.IG_LONG_LIVED_TOKEN || !env.BAKERY_IG_USER_ID) {
    await recordAttempt(supabase);
    return { status: "skipped", reason: "Instagram not connected" };
  }

  try {
    const media = await fetchMedia(env.BAKERY_IG_USER_ID, env.IG_LONG_LIVED_TOKEN);
    const { added, removed } = await applyMedia(supabase, media);
    await writeSyncState(supabase, { ok: true });
    return { status: "ok", synced: media.length, added, removed };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const outcome = await writeSyncState(supabase, { ok: false, error });
    if (outcome.shouldAlert) await alertBaker(env, error, outcome.consecutive_failures);
    return { status: "failed", error, alerted: outcome.shouldAlert };
  }
}

async function fetchMedia(
  igUserId: string,
  token: string,
): Promise<ParsedIgMedia[]> {
  const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${igUserId}/media`);
  url.searchParams.set("fields", MEDIA_FIELDS);
  url.searchParams.set("access_token", token);

  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    // Graph API error bodies are {"error": {"message": "...", ...}} — surface
    // that message (expired token, app not in live mode) instead of just the
    // HTTP status, since that's what actually tells the baker what to fix.
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error?: { message?: string } }).error?.message ?? res.status)
        : String(res.status);
    throw new Error(`Graph API request failed: ${message}`);
  }
  return parseIgMediaResponse(body);
}

/** Upsert the latest posts, then drop rows that fell out of the latest 25 —
 * i.e. genuinely deleted on Instagram, not merely older than a page size. */
async function applyMedia(
  supabase: SupabaseClient<Database>,
  media: ParsedIgMedia[],
): Promise<{ added: number; removed: number }> {
  const { data: existing, error: readError } = await supabase
    .from("ig_media")
    .select("ig_media_id");
  if (readError) throw new Error(`read ig_media: ${readError.message}`);

  const known = new Set((existing ?? []).map((r) => r.ig_media_id));
  const { added, stale } = diffIgMedia(known, media);

  if (media.length > 0) {
    const { error } = await supabase
      .from("ig_media")
      .upsert(
        media.map((m) => ({ ...m, synced_at: new Date().toISOString() })),
        { onConflict: "ig_media_id" },
      );
    if (error) throw new Error(`upsert ig_media: ${error.message}`);
  }

  if (stale.length > 0) {
    const { error } = await supabase
      .from("ig_media")
      .delete()
      .in("ig_media_id", stale);
    if (error) throw new Error(`prune ig_media: ${error.message}`);
  }

  return { added, removed: stale.length };
}

async function writeSyncState(
  supabase: SupabaseClient<Database>,
  result: { ok: true } | { ok: false; error: string },
) {
  const { data: prev } = await supabase
    .from("sync_state")
    .select("consecutive_failures, alerted_at")
    .eq("job", JOB)
    .maybeSingle();

  const outcome = nextSyncState(prev as SyncState | null, result);
  const { shouldAlert, ...row } = outcome;
  void shouldAlert;

  const { error } = await supabase
    .from("sync_state")
    .upsert({ job: JOB, ...row, updated_at: new Date().toISOString() });
  if (error) console.error("sync_state upsert failed:", error.message);

  return outcome;
}

async function recordAttempt(supabase: SupabaseClient<Database>) {
  await supabase.from("sync_state").upsert({
    job: JOB,
    last_attempt_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

async function alertBaker(env: CronEnv, error: string, failures: number) {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM || !env.BAKERY_PRIMARY_EMAIL) {
    console.warn("ig sync alert suppressed: Resend not configured");
    return;
  }
  const settingsUrl = env.SITE_URL ? `${env.SITE_URL}/baker/settings` : "/baker/settings";
  const result = await sendEmail({
    apiKey: env.RESEND_API_KEY,
    from: env.RESEND_FROM,
    to: env.BAKERY_PRIMARY_EMAIL,
    cc: env.BAKERY_BACKUP_EMAIL,
    subject: "Instagram sync is failing — gallery may be out of date",
    html: `
      <h2 style="font-family:sans-serif">Instagram sync has failed ${failures} times in a row</h2>
      <p style="font-family:sans-serif;font-size:14px">
        The gallery is still showing the posts from the last successful sync —
        nothing has disappeared — but anything you've posted since then
        <strong>won't show up on the site yet</strong>.
      </p>
      <p style="font-family:sans-serif;font-size:14px">
        Most likely the access token expired (they last ~60 days and need a
        manual refresh) or the Instagram account got disconnected. See
        <a href="${settingsUrl}">${settingsUrl}</a>.
      </p>
      <p style="font-family:sans-serif;font-size:13px;color:#666">
        Last error: ${escapeHtml(error)}
      </p>`,
  });
  if (!result.ok) console.error("ig sync alert email failed:", result.error);
}
