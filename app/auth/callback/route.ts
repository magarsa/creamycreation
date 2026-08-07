import { NextResponse } from "next/server";
import { createClient } from "@/lib/db/server";

/*
 * Magic-link landing. Supabase redirects here with a `code`; we exchange it for
 * a session (sets the auth cookies) and continue to the dashboard. `next` must
 * be a same-origin path.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/baker/orders";
  const safeNext = next.startsWith("/") ? next : "/baker/orders";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }
  return NextResponse.redirect(`${origin}/baker/login?error=auth`);
}
