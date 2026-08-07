import { createPublicClient } from "./public";
import type { Tables } from "./types";

export type Cake = Tables<"cakes">;
export type Config = Tables<"config">;

/** Active curated cakes, ordered for the gallery. */
export async function getActiveCakes(): Promise<Cake[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("cakes")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** A single active cake by slug, or null if not found. */
export async function getCakeBySlug(slug: string): Promise<Cake | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("cakes")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** The single public config row (min-notice, pickup window, vacation state). */
export async function getPublicConfig(): Promise<Config | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("config")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
