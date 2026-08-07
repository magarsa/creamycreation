import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/*
 * Service-role Supabase client. Bypasses RLS, so it is the ONLY way inquiries get
 * written (the public anon key has no insert policy). SERVER-ONLY — never import
 * this from a Client Component or the service key would ship to the browser.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient() must never run in the browser");
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
