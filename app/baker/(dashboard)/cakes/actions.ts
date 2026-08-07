"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/db/server";
import { CATEGORIES, type Category } from "@/lib/domain/order";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
}

function isCategory(v: string): v is Category {
  return (CATEGORIES as readonly string[]).includes(v);
}

export async function addCake(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  if (!title || !isCategory(category)) return;

  const supabase = await createClient();
  // Short suffix keeps slugs unique without ugly collisions.
  const slug = `${slugify(title) || "cake"}-${crypto.randomUUID().slice(0, 4)}`;

  await supabase.from("cakes").insert({
    title,
    slug,
    category,
    size: String(formData.get("size") ?? "").trim() || null,
    flavour: String(formData.get("flavour") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
  });

  revalidatePath("/baker/cakes");
  revalidatePath("/cakes");
}

export async function toggleCake(formData: FormData) {
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  const supabase = await createClient();
  await supabase.from("cakes").update({ is_active: !active }).eq("id", id);
  revalidatePath("/baker/cakes");
  revalidatePath("/cakes");
}
