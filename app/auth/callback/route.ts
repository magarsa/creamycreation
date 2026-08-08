import { NextResponse } from "next/server";
import { createClient } from "@/lib/db/server";

/*
 * Magic-link landing. Two shapes hit this route:
 *   - success: Supabase redirects here with a `code`; we exchange it for a
 *     session (sets the auth cookies) and continue to the dashboard.
 *   - failure: Supabase redirects here with `error`/`error_code` instead — the
 *     link was invalid before we ever saw a `code` (expired, already used, or
 *     consumed early by an email client's link-prescanning). We forward a
 *     short reason so the login page can explain what happened instead of
 *     silently showing a blank form.
 * `next` must be a same-origin path.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const errorCode = searchParams.get("error_code");
  const next = searchParams.get("next") ?? "/baker/orders";
  const safeNext = next.startsWith("/") ? next : "/baker/orders";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  const reason = errorCode === "otp_expired" ? "expired" : "auth";
  return NextResponse.redirect(`${origin}/baker/login?error=${reason}`);
}
