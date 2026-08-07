import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";

/*
 * Refreshes the Supabase session cookie on each request and guards /baker/*.
 * Standard @supabase/ssr middleware pattern — do not add logic between creating
 * the client and calling getUser().
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isDashboard =
    path.startsWith("/baker") && !path.startsWith("/baker/login");
  if (isDashboard && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/baker/login";
    return NextResponse.redirect(url);
  }

  return response;
}
