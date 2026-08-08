import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { addDaysKey, todayKeyInTz } from "../../../lib/domain/availability";
import { blockedDatesFromIcs, isIcsPayload } from "../../../lib/domain/ics";
import { nextSyncState, type SyncState } from "../../../lib/domain/sync";
import { escapeHtml, sendEmail } from "../../../lib/notifications/email";
import type { Database } from "../../../lib/db/types";
import type { CronEnv } from "./env";

/*
 * ICS → blocked_dates, once an hour.
 *
 *   fetch feed ──▶ looks like a calendar? ──no──▶ record failure, KEEP cache
 *        │                                          └─ 3rd in a row: email baker
 *        yes
 *        ▼
 *   parse to date keys within the booking window
 *        ▼
 *   UPSERT the new set ──▶ then DELETE the ics rows that fell out of it
 *        │                 (upsert-first: a half-finished run over-blocks,
 *        ▼                  which loses a sale — the other order loses a cake)
 *   record success, clear the failure streak
 *
 * Everything the public picker reads is a cache. The feed is the source of
 * truth, so a failed run changes nothing rather than opening dates up.
 */

const JOB = "ics";
const WINDOW_DAYS = 400; // the picker shows ~6 months; a year of slack is cheap
const FETCH_TIMEOUT_MS = 15_000;

export type SyncResult =
  | { status: "skipped"; reason: string }
  | { status: "ok"; blocked: number; added: number; removed: number }
  | { status: "failed"; error: string; alerted: boolean };

export async function syncIcs(env: CronEnv): Promise<SyncResult> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return { status: "skipped", reason: "Supabase binding not configured" };
  }
  const supabase = createClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // No feed yet is a legitimate pre-launch state, not an outage: don't count it
  // as a failure or the baker gets an alert about a URL she never set.
  if (!env.BAKERY_ICS_URL) {
    await recordAttempt(supabase);
    return { status: "skipped", reason: "BAKERY_ICS_URL not set" };
  }

  const timeZone = env.BAKERY_TIMEZONE || "America/New_York";
  const fromKey = todayKeyInTz(timeZone);
  const toKey = addDaysKey(fromKey, WINDOW_DAYS);

  try {
    const blocked = await fetchBlockedDates(env.BAKERY_ICS_URL, {
      timeZone,
      fromKey,
      toKey,
    });
    const { added, removed } = await applyBlockedDates(supabase, blocked, {
      fromKey,
      toKey,
    });
    await writeSyncState(supabase, { ok: true });
    return { status: "ok", blocked: blocked.size, added, removed };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const outcome = await writeSyncState(supabase, { ok: false, error });
    if (outcome.shouldAlert) await alertBaker(env, error, outcome.consecutive_failures);
    return { status: "failed", error, alerted: outcome.shouldAlert };
  }
}

async function fetchBlockedDates(
  url: string,
  opts: { timeZone: string; fromKey: string; toKey: string },
): Promise<Map<string, string | undefined>> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { Accept: "text/calendar" },
  });
  if (!res.ok) throw new Error(`ICS fetch returned ${res.status}`);

  const body = await res.text();
  if (!isIcsPayload(body)) {
    throw new Error("ICS response is not a calendar (is the URL still published?)");
  }
  return blockedDatesFromIcs(body, opts);
}

/** Upsert the feed's dates, then drop the ics-sourced ones that fell out of it. */
async function applyBlockedDates(
  supabase: SupabaseClient<Database>,
  blocked: Map<string, string | undefined>,
  window: { fromKey: string; toKey: string },
): Promise<{ added: number; removed: number }> {
  // Only ics rows inside the window are ours to touch — a manual block stays put,
  // and dates beyond the window were never in this run's scope.
  const { data: existing, error: readError } = await supabase
    .from("blocked_dates")
    .select("blocked_date")
    .eq("source", "ics")
    .gte("blocked_date", window.fromKey)
    .lte("blocked_date", window.toKey);
  if (readError) throw new Error(`read blocked_dates: ${readError.message}`);

  const known = new Set((existing ?? []).map((r) => r.blocked_date));
  const added = [...blocked.keys()].filter((d) => !known.has(d)).length;
  const stale = [...known].filter((d) => !blocked.has(d));

  const syncedAt = new Date().toISOString();
  const rows = [...blocked].map(([blocked_date, reason]) => ({
    blocked_date,
    reason: reason ?? null,
    source: "ics",
    synced_at: syncedAt,
  }));

  if (rows.length > 0) {
    const { error } = await supabase
      .from("blocked_dates")
      .upsert(rows, { onConflict: "blocked_date" });
    if (error) throw new Error(`upsert blocked_dates: ${error.message}`);
  }

  if (stale.length > 0) {
    const { error } = await supabase
      .from("blocked_dates")
      .delete()
      .in("blocked_date", stale);
    if (error) throw new Error(`prune blocked_dates: ${error.message}`);
  }

  return { added, removed: stale.length };
}

/** Reads the previous streak, applies the fail-open policy, writes it back. */
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
  void shouldAlert; // caller's concern, not a column

  const { error } = await supabase
    .from("sync_state")
    .upsert({ job: JOB, ...row, updated_at: new Date().toISOString() });
  if (error) console.error("sync_state upsert failed:", error.message);

  return outcome;
}

/** Stamps last_attempt_at for a run that had nothing to do. */
async function recordAttempt(supabase: SupabaseClient<Database>) {
  await supabase.from("sync_state").upsert({
    job: JOB,
    last_attempt_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

async function alertBaker(env: CronEnv, error: string, failures: number) {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM || !env.BAKERY_PRIMARY_EMAIL) {
    console.warn("ics sync alert suppressed: Resend not configured");
    return;
  }
  const calendarUrl = env.SITE_URL ? `${env.SITE_URL}/baker/calendar` : "/baker/calendar";
  const result = await sendEmail({
    apiKey: env.RESEND_API_KEY,
    from: env.RESEND_FROM,
    to: env.BAKERY_PRIMARY_EMAIL,
    cc: env.BAKERY_BACKUP_EMAIL,
    subject: "Calendar sync is failing — dates may be out of date",
    html: `
      <h2 style="font-family:sans-serif">Calendar sync has failed ${failures} times in a row</h2>
      <p style="font-family:sans-serif;font-size:14px">
        Your booking calendar hasn't synced since the last successful run. The site
        is still using the dates it already had, so nothing has opened up by
        mistake — but any booking you've added since then is <strong>not</strong>
        blocked on the site yet.
      </p>
      <p style="font-family:sans-serif;font-size:14px">
        Most likely the calendar's secret address changed or was un-published.
        See <a href="${calendarUrl}">${calendarUrl}</a> for sync status.
      </p>
      <p style="font-family:sans-serif;font-size:13px;color:#666">
        Last error: ${escapeHtml(error)}
      </p>`,
  });
  if (!result.ok) console.error("ics sync alert email failed:", result.error);
}
