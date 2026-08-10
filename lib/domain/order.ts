import { z } from "zod";

/*
 * The order-draft domain: the fixed option lists the funnel offers, and the Zod
 * schema the submit-inquiry handler validates against. Pure (no framework/db
 * imports) so it can be shared and unit-tested. `occasion`/`flavour` map to
 * fixed lists (`occasion` is also the DB `category` enum); `size` and add-ons
 * are baker-configurable (lib/db/queries.ts `getActiveSizes`/`getActiveAddons`),
 * so the schema only checks shape here — the submit route re-validates size
 * and addon_ids against what's actually active in the DB (see route.ts,
 * mirroring its existing checkDateBookable pattern).
 */

export const CATEGORIES = [
  "birthday",
  "kids",
  "anniversary",
  "wedding",
  "cupcakes",
  "just_because",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const OCCASION_LABELS: Record<Category, string> = {
  birthday: "Birthday",
  kids: "Kids",
  anniversary: "Anniversary",
  wedding: "Wedding",
  cupcakes: "Cupcakes",
  just_because: "Just because",
};

export const FLAVOURS = [
  "Vanilla bean",
  "Chocolate",
  "Red velvet",
  "Funfetti",
  "Lemon",
  "Carrot",
] as const;
export type Flavour = (typeof FLAVOURS)[number];

export const STYLE_TAGS = [
  "Minimal",
  "Rustic",
  "Elegant",
  "Playful",
  "Floral",
  "Modern",
] as const;

export const MAX_REFERENCE_PHOTOS = 6;
export const MAX_MESSAGE_LENGTH = 100;
export const MAX_ADDONS = 8;

/** Blank string inputs from an HTML form should read as "not provided". */
const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

export const inquirySubmissionSchema = z.object({
  event_date: z.iso.date(), // "YYYY-MM-DD"
  occasion: z.enum(CATEGORIES),
  size: z.string().trim().min(1, "Pick a size"),
  flavour: z.enum(FLAVOURS),
  addon_ids: z.array(z.uuid()).max(MAX_ADDONS).optional().default([]),
  preferred_name: z.string().trim().min(1, "Tell me your name").max(120),
  // Required, unlike ig_handle: it's the fallback that works even if the
  // customer never completes the Instagram DM handoff (Instagram's messaging
  // rules don't let the baker message first) — see lib/notifications/resend.ts.
  email: z.email("Enter a valid email").trim().max(254),
  message: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(MAX_MESSAGE_LENGTH).optional(),
  ),
  notes: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(2000).optional(),
  ),
  reference_link: z.preprocess(
    emptyToUndefined,
    z.url().max(500).optional(),
  ),
  style_tag: z.preprocess(emptyToUndefined, z.enum(STYLE_TAGS).optional()),
  ig_handle: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(60).optional(),
  ),
  photo_paths: z
    .array(z.string().max(300))
    .max(MAX_REFERENCE_PHOTOS)
    .optional()
    .default([]),
  idempotency_key: z.uuid(),
});

export type InquirySubmission = z.infer<typeof inquirySubmissionSchema>;
