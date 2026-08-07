import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/db/admin";

/*
 * Mint a short-lived signed upload URL for a reference photo. The customer's
 * browser uploads directly to the private `inquiry-photos` bucket under
 * `pending/{session}/…` using this URL — no anon storage policy needed. The
 * submit handler later moves the file to `bound/{inquiryId}/…`.
 */
const schema = z.object({
  session_id: z.uuid(),
  filename: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation" }, { status: 422 });
  }
  const { session_id, filename } = parsed.data;

  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
  const path = `pending/${session_id}/${crypto.randomUUID()}-${safe}`;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("inquiry-photos")
    .createSignedUploadUrl(path);

  if (error || !data) {
    console.error("createSignedUploadUrl failed:", error);
    return NextResponse.json({ error: "storage" }, { status: 500 });
  }

  return NextResponse.json({
    path: data.path,
    token: data.token,
    signedUrl: data.signedUrl,
  });
}
