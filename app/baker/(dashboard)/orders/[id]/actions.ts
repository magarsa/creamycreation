"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/db/server";
import { canTransition, type InquiryStatus } from "@/lib/domain/status";

/*
 * Baker mutations. Auth is enforced by RLS (is_baker) — a non-baker session
 * updates 0 rows — plus the /baker layout gate. Status changes also validate the
 * transition against the allowed flow so the UI can't jump to an invalid state.
 */
export async function updateStatus(formData: FormData) {
  const id = String(formData.get("id"));
  const to = String(formData.get("to")) as InquiryStatus;
  const supabase = await createClient();

  const { data: current } = await supabase
    .from("inquiries")
    .select("status")
    .eq("id", id)
    .single();
  if (!current || !canTransition(current.status, to)) return;

  await supabase
    .from("inquiries")
    .update({ status: to, status_changed_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath(`/baker/orders/${id}`);
  revalidatePath("/baker/orders");
}

export async function saveNotes(formData: FormData) {
  const id = String(formData.get("id"));
  const notes = String(formData.get("internal_notes") ?? "").trim();
  const supabase = await createClient();

  await supabase
    .from("inquiries")
    .update({ internal_notes: notes || null })
    .eq("id", id);

  revalidatePath(`/baker/orders/${id}`);
}
