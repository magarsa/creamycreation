import { createPublicClient } from "./public";
import type { Tables } from "./types";

export type Cake = Tables<"cakes">;
export type Config = Tables<"config">;

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
