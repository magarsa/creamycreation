import { createAdminClient } from "./admin";
import type { Tables } from "./types";
import type { InquirySubmission } from "@/lib/domain/order";

export type Inquiry = Tables<"inquiries">;

export interface CreateInquiryResult {
  inquiry: Inquiry;
  duplicate: boolean;
}

/*
 * Persist an inquiry using the service role (RLS-bypassing — anon cannot write).
 * Idempotent on `idempotency_key`: a repeated submit (double-tap, retry) returns
 * the original row instead of creating a duplicate. Reference photos, if any, are
 * moved from their pending upload location to a folder bound to the inquiry.
 */
export async function createInquiry(
  sub: InquirySubmission,
): Promise<CreateInquiryResult> {
  const admin = createAdminClient();

  const insert = await admin
    .from("inquiries")
    .insert({
      event_date: sub.event_date,
      occasion: sub.occasion,
      size: sub.size,
      flavour: sub.flavour,
      message: sub.message ?? null,
      notes: sub.notes ?? null,
      reference_link: sub.reference_link ?? null,
      style_tag: sub.style_tag ?? null,
      preferred_name: sub.preferred_name,
      email: sub.email,
      ig_handle: sub.ig_handle ?? null,
      idempotency_key: sub.idempotency_key,
    })
    .select()
    .single();

  if (insert.error) {
    // 23505 = unique_violation on idempotency_key → return the original inquiry.
    if (insert.error.code === "23505") {
      const existing = await admin
        .from("inquiries")
        .select()
        .eq("idempotency_key", sub.idempotency_key)
        .single();
      if (existing.error) throw existing.error;
      return { inquiry: existing.data, duplicate: true };
    }
    throw insert.error;
  }

  const inquiry = insert.data;

  if (sub.photo_paths && sub.photo_paths.length > 0) {
    await bindPhotos(admin, inquiry.id, sub.photo_paths);
  }

  return { inquiry, duplicate: false };
}

/** Move uploaded photos from pending/ to bound/{inquiryId}/ and record them. */
async function bindPhotos(
  admin: ReturnType<typeof createAdminClient>,
  inquiryId: string,
  pendingPaths: string[],
): Promise<void> {
  const bucket = admin.storage.from("inquiry-photos");
  const inserts: {
    inquiry_id: string;
    storage_path: string;
    sort_order: number;
  }[] = [];

  for (let i = 0; i < pendingPaths.length; i++) {
    const from = pendingPaths[i];
    if (!from.startsWith("pending/")) continue; // ignore unexpected paths
    const filename = from.split("/").pop() ?? `photo-${i}`;
    const to = `bound/${inquiryId}/${filename}`;
    const { error } = await bucket.move(from, to);
    // A failed move is non-fatal — photos are optional; never lose the inquiry.
    if (!error) {
      inserts.push({ inquiry_id: inquiryId, storage_path: to, sort_order: i });
    }
  }

  if (inserts.length > 0) {
    await admin.from("inquiry_photos").insert(inserts);
  }
}

/** Record whether the baker notification email went out. */
export async function markNotification(
  inquiryId: string,
  status: "sent" | "failed",
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("inquiries")
    .update({
      notification_status: status,
      notification_last_attempt_at: new Date().toISOString(),
    })
    .eq("id", inquiryId);
}
