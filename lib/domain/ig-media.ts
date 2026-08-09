import { z } from "zod";
import type { Category } from "./order";

/*
 * Instagram Graph API `/{ig-user-id}/media` response → normalized rows, plus
 * the gallery merge (curated `cakes` + synced `ig_media`) that ROADMAP Phase 4
 * calls for. Pure and DB-agnostic, like the rest of lib/domain — callers map
 * their own DB rows into the plain shapes below.
 *
 * Confirmed against the current Instagram Platform docs (developers.facebook.com
 * /docs/instagram-platform/instagram-graph-api/reference/ig-user/media): the
 * supported fields are id, caption, media_type, media_url, permalink,
 * thumbnail_url, timestamp. `thumbnail_url` is only present for VIDEO — for
 * IMAGE/CAROUSEL_ALBUM, `media_url` already points at a displayable image.
 */

export const IG_MEDIA_TYPES = ["IMAGE", "VIDEO", "CAROUSEL_ALBUM"] as const;
export type IgMediaType = (typeof IG_MEDIA_TYPES)[number];

const graphMediaItemSchema = z.object({
  id: z.string().min(1),
  caption: z.string().optional(),
  media_type: z.enum(IG_MEDIA_TYPES),
  media_url: z.url(),
  permalink: z.url(),
  // Graph API actually sends "2026-08-01T14:30:00+0000" — a valid ISO 8601
  // offset, but without the colon zod's strict z.iso.datetime() requires. A
  // Date.parse-backed check accepts real API output instead of a spec that
  // isn't what Meta ships.
  timestamp: z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
    message: "not a parseable timestamp",
  }),
  thumbnail_url: z.url().optional(),
});

const graphMediaResponseSchema = z.object({
  data: z.array(graphMediaItemSchema),
});

export interface ParsedIgMedia {
  ig_media_id: string;
  caption: string | null;
  media_url: string;
  permalink: string;
  thumbnail_url: string | null;
  media_type: IgMediaType;
  posted_at: string;
}

/** Throws on a response that isn't shaped like the Graph API's media list — the
 * caller (sync-ig.ts) treats that as a failed run, same as ics.ts's non-calendar
 * check: a token gone bad or an app in "development mode" should count as an
 * outage, not silently sync zero posts and prune everything that came before. */
export function parseIgMediaResponse(json: unknown): ParsedIgMedia[] {
  const parsed = graphMediaResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`unexpected Graph API response shape: ${parsed.error.message}`);
  }
  return parsed.data.data.map((item) => ({
    ig_media_id: item.id,
    caption: item.caption ?? null,
    media_url: item.media_url,
    permalink: item.permalink,
    thumbnail_url: item.thumbnail_url ?? null,
    media_type: item.media_type,
    posted_at: item.timestamp,
  }));
}

/** The image to actually render — thumbnail for VIDEO, media_url otherwise. */
export function igDisplayUrl(item: {
  media_url: string;
  thumbnail_url: string | null;
}): string {
  return item.thumbnail_url ?? item.media_url;
}

/**
 * What a sync run needs to do to the table, given the ids already stored and
 * the freshly-fetched media: which of the incoming posts are genuinely new
 * (for the sync's "added" count), and which stored ids fell out of the fetch
 * entirely and should be pruned as deleted-on-Instagram. Pure so the dedup
 * logic (and its edge cases — nothing stored yet, nothing fetched, no change)
 * is testable without a database. sync-ig.ts does the actual upsert/delete.
 */
export function diffIgMedia(
  knownIds: ReadonlySet<string>,
  incoming: ParsedIgMedia[],
): { added: number; stale: string[] } {
  const incomingIds = new Set(incoming.map((m) => m.ig_media_id));
  const added = incoming.filter((m) => !knownIds.has(m.ig_media_id)).length;
  const stale = [...knownIds].filter((id) => !incomingIds.has(id));
  return { added, stale };
}

// ── Gallery merge ────────────────────────────────────────────────────────────

export interface CakeForGallery {
  id: string;
  title: string;
  slug: string;
  category: Category;
}

export interface IgMediaForGallery {
  id: string;
  caption: string | null;
  permalink: string;
  mediaUrl: string;
  thumbnailUrl: string | null;
  postedAt: string;
}

export type GalleryItem =
  | { source: "cake"; id: string; title: string; slug: string; category: Category }
  | {
      source: "ig";
      id: string;
      caption: string | null;
      permalink: string;
      displayUrl: string;
      postedAt: string;
    };

/**
 * Curated cakes first (the baker's intentional picks, in their existing
 * sort_order — the caller passes them pre-sorted), then IG posts newest first.
 * Source-ordered rather than date-interleaved: cakes don't carry a "posted"
 * timestamp comparable to an IG post's (only upload time), so merging by a
 * single clock would misrepresent hand-picked work as merely old. IG items
 * have no category, so they only ever appear under the "All" filter — the
 * category filter is a claim about curated work, not something the sync can
 * infer from a caption.
 */
export function mergeGalleryItems(
  cakes: CakeForGallery[],
  igMedia: IgMediaForGallery[],
): GalleryItem[] {
  const cakeItems: GalleryItem[] = cakes.map((c) => ({
    source: "cake",
    id: c.id,
    title: c.title,
    slug: c.slug,
    category: c.category,
  }));

  const igItems: GalleryItem[] = [...igMedia]
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt))
    .map((m) => ({
      source: "ig",
      id: m.id,
      caption: m.caption,
      permalink: m.permalink,
      displayUrl: igDisplayUrl({ media_url: m.mediaUrl, thumbnail_url: m.thumbnailUrl }),
      postedAt: m.postedAt,
    }));

  return [...cakeItems, ...igItems];
}
