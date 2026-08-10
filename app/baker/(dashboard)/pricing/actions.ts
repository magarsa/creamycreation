"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/db/server";

function revalidatePricingPaths() {
  revalidatePath("/baker/pricing");
  revalidatePath("/order/details");
  revalidatePath("/flavours");
}

/** Dollar-string form input ("6.50") to whole cents, or null if not a usable number. */
function parseDollarsToCents(v: FormDataEntryValue | null): number | null {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export async function addSize(formData: FormData) {
  const label = String(formData.get("label") ?? "").trim();
  const priceCents = parseDollarsToCents(formData.get("base_price"));
  if (!label || priceCents === null) return;

  const supabase = await createClient();
  await supabase.from("sizes").insert({ label, base_price_cents: priceCents });
  revalidatePricingPaths();
}

export async function toggleSize(formData: FormData) {
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  const supabase = await createClient();
  await supabase.from("sizes").update({ is_active: !active }).eq("id", id);
  revalidatePricingPaths();
}

export async function deleteSize(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("sizes").delete().eq("id", id);
  revalidatePricingPaths();
}

export async function addAddon(formData: FormData) {
  const label = String(formData.get("label") ?? "").trim();
  const minCents = parseDollarsToCents(formData.get("price_min"));
  const maxCents = parseDollarsToCents(formData.get("price_max"));
  if (!label || minCents === null || maxCents === null || maxCents < minCents) return;

  const supabase = await createClient();
  await supabase
    .from("addons")
    .insert({ label, price_min_cents: minCents, price_max_cents: maxCents });
  revalidatePricingPaths();
}

export async function toggleAddon(formData: FormData) {
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  const supabase = await createClient();
  await supabase.from("addons").update({ is_active: !active }).eq("id", id);
  revalidatePricingPaths();
}

export async function deleteAddon(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("addons").delete().eq("id", id);
  revalidatePricingPaths();
}
