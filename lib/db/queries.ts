import { createPublicClient } from "./public";
import type { Tables } from "./types";

export type Cake = Tables<"cakes">;
export type Config = Tables<"config">;
export type IgMedia = Tables<"ig_media">;

/*
 * Public read queries. These run at build time (SSG/ISR) and at request time, so
 * they degrade gracefully: if Supabase env is absent or the DB is unreachable,
 * they return empty rather than failing the whole build/deploy. A populated
 * gallery needs NEXT_PUBLIC_SUPABASE_URL/ANON_KEY present at build (real data);
 * without them the site still builds and the order funnel still works.
 */

/** Active curated cakes, ordered for the gallery. */
export async function getActiveCakes(): Promise<Cake[]> {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("cakes")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    console.warn("getActiveCakes failed; returning []:", errMessage(err));
    return [];
  }
}

/** A single active cake by slug, or null if not found / unavailable. */
export async function getCakeBySlug(slug: string): Promise<Cake | null> {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("cakes")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn("getCakeBySlug failed; returning null:", errMessage(err));
    return null;
  }
}

/**
 * Blocked date keys ("YYYY-MM-DD") in the given window, from the ICS cache.
 *
 * Degrades to [] like the queries above. That opens dates up rather than closing
 * them, which is the deliberate fail-open choice (PLAN.md §5): the baker can
 * decline one inquiry for a taken day, but a picker that greys out every date
 * because a read hiccuped loses every sale until someone notices.
 */
export async function getBlockedDates(
  fromKey: string,
  toKey: string,
): Promise<string[]> {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      // `blocked_date` only — `reason` is a calendar event title and is not
      // granted to anon (migration 0004). Selecting it here would 403.
      .from("blocked_dates")
      .select("blocked_date")
      .gte("blocked_date", fromKey)
      .lte("blocked_date", toKey);
    if (error) throw error;
    return (data ?? []).map((row) => row.blocked_date);
  } catch (err) {
    console.warn("getBlockedDates failed; returning []:", errMessage(err));
    return [];
  }
}

/** Visible IG posts, newest first, for the gallery. Hidden ones never leave
 * the database via this path — RLS filters them at the row level, not here. */
export async function getVisibleIgMedia(limit = 25): Promise<IgMedia[]> {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("ig_media")
      .select("*")
      .order("posted_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    console.warn("getVisibleIgMedia failed; returning []:", errMessage(err));
    return [];
  }
}

/** The single public config row, or null if unavailable. */
export async function getPublicConfig(): Promise<Config | null> {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("config")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn("getPublicConfig failed; returning null:", errMessage(err));
    return null;
  }
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
