import { z } from "zod";

/*
 * The order-draft domain: the fixed option lists the funnel offers, and the Zod
 * schema the submit-inquiry handler validates against. Pure (no framework/db
 * imports) so it can be shared and unit-tested. `occasion` maps to the DB
 * `category` enum; `size`/`flavour` are stored as text but constrained here to
 * the offered lists so the baker never gets garbage.
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

export const SIZES = [
  '6" round · serves 8–10',
  '8" round · serves 14–18',
  '10" round · serves 20–25',
  "Two tiers · serves ~40",
  "Dozen cupcakes",
] as const;
export type Size = (typeof SIZES)[number];

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

/** Blank string inputs from an HTML form should read as "not provided". */
const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

export const inquirySubmissionSchema = z.object({
  event_date: z.iso.date(), // "YYYY-MM-DD"
  occasion: z.enum(CATEGORIES),
  size: z.enum(SIZES),
  flavour: z.enum(FLAVOURS),
  preferred_name: z.string().trim().min(1, "Tell me your name").max(120),
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
