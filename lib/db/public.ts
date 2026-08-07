import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/*
 * Cookieless anon client for PUBLIC reads (cakes, config). Unlike the SSR
 * server client, it doesn't touch cookies, so pages using it stay statically
 * cacheable / ISR-able. RLS still applies (anon role) — it can only read what
 * the public policies allow.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
