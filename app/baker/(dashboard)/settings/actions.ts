"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/db/server";

export async function updateConfig(formData: FormData) {
  const supabase = await createClient();
  const { data: config } = await supabase
    .from("config")
    .select("id")
    .limit(1)
    .single();
  if (!config) return;

  await supabase
    .from("config")
    .update({
      vacation_mode: formData.get("vacation_mode") === "on",
      vacation_message:
        String(formData.get("vacation_message") ?? "").trim() || null,
      max_cakes_per_week: Math.max(
        1,
        Number(formData.get("max_cakes_per_week")) || 3,
      ),
      min_notice_days: Math.max(0, Number(formData.get("min_notice_days")) || 7),
      pickup_window:
        String(formData.get("pickup_window") ?? "").trim() || "Sat 10am–2pm",
    })
    .eq("id", config.id);

  revalidatePath("/baker/settings");
  revalidatePath("/order/date");
}

export async function toggleIgMedia(formData: FormData) {
  const id = String(formData.get("id"));
  const hidden = formData.get("hidden") === "true";
  const supabase = await createClient();
  // RLS narrows this to the is_hidden column only (migration 0005) — even a
  // hand-crafted request from this same session can't touch caption/media_url.
  await supabase.from("ig_media").update({ is_hidden: !hidden }).eq("id", id);
  revalidatePath("/baker/settings");
  revalidatePath("/cakes");
}
