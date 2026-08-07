import { redirect } from "next/navigation";
import { createClient } from "./db/server";

/*
 * Gate a Server Component to the baker. Belt-and-suspenders on top of RLS: even
 * if a non-allowlisted user gets a session, is_baker() (RPC → same allowlist as
 * RLS) sends them away. Returns the authed Supabase client for queries.
 */
export async function requireBaker() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/baker/login");

  const { data: isBaker } = await supabase.rpc("is_baker");
  if (!isBaker) redirect("/baker/login?error=forbidden");

  return { user, supabase };
}
