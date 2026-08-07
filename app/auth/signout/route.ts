import { NextResponse } from "next/server";
import { createClient } from "@/lib/db/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // 303 so the browser issues a GET to the login page.
  return NextResponse.redirect(new URL("/baker/login", request.url), {
    status: 303,
  });
}
