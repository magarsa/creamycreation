import { describe, expect, it } from "vitest";
import {
  diffIgMedia,
  igDisplayUrl,
  mergeGalleryItems,
  parseIgMediaResponse,
  type CakeForGallery,
  type IgMediaForGallery,
  type ParsedIgMedia,
} from "./ig-media";

function graphItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "17895695668004550",
    caption: "Birthday cake for a Saturday pickup",
    media_type: "IMAGE",
    media_url: "https://scontent.cdninstagram.com/photo.jpg",
    permalink: "https://www.instagram.com/p/abc123/",
    timestamp: "2026-08-01T14:30:00+0000",
    ...overrides,
  };
}

describe("parseIgMediaResponse", () => {
  it("parses a well-formed Graph API media list", () => {
    const result = parseIgMediaResponse({ data: [graphItem()] });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      ig_media_id: "17895695668004550",
      caption: "Birthday cake for a Saturday pickup",
      media_url: "https://scontent.cdninstagram.com/photo.jpg",
      permalink: "https://www.instagram.com/p/abc123/",
      thumbnail_url: null,
      media_type: "IMAGE",
      posted_at: "2026-08-01T14:30:00+0000",
    });
  });

  it("keeps thumbnail_url when present (VIDEO posts)", () => {
    const result = parseIgMediaResponse({
      data: [
        graphItem({
          media_type: "VIDEO",
          media_url: "https://scontent.cdninstagram.com/video.mp4",
          thumbnail_url: "https://scontent.cdninstagram.com/video-thumb.jpg",
        }),
      ],
    });
    expect(result[0].thumbnail_url).toBe(
      "https://scontent.cdninstagram.com/video-thumb.jpg",
    );
  });

  it("defaults a missing caption to null rather than dropping the post", () => {
    const item = graphItem();
    delete (item as Record<string, unknown>).caption;
    const result = parseIgMediaResponse({ data: [item] });
    expect(result[0].caption).toBeNull();
  });

  it("handles an empty media list", () => {
    expect(parseIgMediaResponse({ data: [] })).toEqual([]);
  });

  it("throws on a response that isn't the Graph API media shape", () => {
    // e.g. an expired-token error body, or an HTML login page that somehow 200s
    expect(() =>
      parseIgMediaResponse({ error: { message: "Invalid OAuth access token" } }),
    ).toThrow(/unexpected Graph API response shape/);
  });

  it("throws when an item is missing a required field", () => {
    const item = graphItem();
    delete (item as Record<string, unknown>).media_url;
    expect(() => parseIgMediaResponse({ data: [item] })).toThrow();
  });

  it("throws on an unrecognized media_type", () => {
    expect(() =>
      parseIgMediaResponse({ data: [graphItem({ media_type: "STORY" })] }),
    ).toThrow();
  });
});

function parsedMedia(id: string): ParsedIgMedia {
  return {
    ig_media_id: id,
    caption: null,
    media_url: `https://example.com/${id}.jpg`,
    permalink: `https://www.instagram.com/p/${id}/`,
    thumbnail_url: null,
    media_type: "IMAGE",
    posted_at: "2026-08-01T00:00:00+0000",
  };
}

describe("diffIgMedia", () => {
  it("counts every fetched post as added when nothing is stored yet", () => {
    const { added, stale } = diffIgMedia(new Set(), [parsedMedia("a"), parsedMedia("b")]);
    expect(added).toBe(2);
    expect(stale).toEqual([]);
  });

  it("finds nothing added or stale when the fetch matches storage exactly", () => {
    const { added, stale } = diffIgMedia(
      new Set(["a", "b"]),
      [parsedMedia("a"), parsedMedia("b")],
    );
    expect(added).toBe(0);
    expect(stale).toEqual([]);
  });

  it("flags a stored id as stale when a post drops off the latest-25 fetch", () => {
    // Simulates a post deleted on Instagram: it's not in this run's response.
    const { added, stale } = diffIgMedia(new Set(["a", "b"]), [parsedMedia("a")]);
    expect(added).toBe(0);
    expect(stale).toEqual(["b"]);
  });

  it("handles a mix of new, unchanged, and stale in one run", () => {
    const { added, stale } = diffIgMedia(
      new Set(["old1", "old2", "keep"]),
      [parsedMedia("keep"), parsedMedia("new1")],
    );
    expect(added).toBe(1);
    expect(stale.sort()).toEqual(["old1", "old2"]);
  });

  it("treats an empty fetch as every stored post going stale", () => {
    // A real outage throws before diffIgMedia is called (fail-open, per
    // sync-ig.ts) — this is the case where the API genuinely returns zero
    // posts, e.g. every post was deleted.
    const { added, stale } = diffIgMedia(new Set(["a", "b"]), []);
    expect(added).toBe(0);
    expect(stale.sort()).toEqual(["a", "b"]);
  });
});

describe("igDisplayUrl", () => {
  it("prefers thumbnail_url when set (VIDEO)", () => {
    expect(
      igDisplayUrl({ media_url: "video.mp4", thumbnail_url: "thumb.jpg" }),
    ).toBe("thumb.jpg");
  });

  it("falls back to media_url when there's no thumbnail (IMAGE/CAROUSEL)", () => {
    expect(igDisplayUrl({ media_url: "photo.jpg", thumbnail_url: null })).toBe(
      "photo.jpg",
    );
  });
});

describe("mergeGalleryItems", () => {
  const cakes: CakeForGallery[] = [
    { id: "c1", title: "Classic Vanilla", slug: "classic-vanilla", category: "birthday" },
    { id: "c2", title: "Anniversary Rose", slug: "anniversary-rose", category: "anniversary" },
  ];
  const ig: IgMediaForGallery[] = [
    {
      id: "m1",
      caption: "older post",
      permalink: "https://instagram.com/p/1",
      mediaUrl: "old.jpg",
      thumbnailUrl: null,
      postedAt: "2026-07-01T00:00:00Z",
    },
    {
      id: "m2",
      caption: "newer post",
      permalink: "https://instagram.com/p/2",
      mediaUrl: "new.jpg",
      thumbnailUrl: null,
      postedAt: "2026-08-01T00:00:00Z",
    },
  ];

  it("puts curated cakes first, in their given order", () => {
    const merged = mergeGalleryItems(cakes, []);
    expect(merged.map((i) => i.id)).toEqual(["c1", "c2"]);
    expect(merged.every((i) => i.source === "cake")).toBe(true);
  });

  it("orders IG posts newest first, after all cakes", () => {
    const merged = mergeGalleryItems(cakes, ig);
    expect(merged.map((i) => i.id)).toEqual(["c1", "c2", "m2", "m1"]);
  });

  it("handles no cakes and no ig media", () => {
    expect(mergeGalleryItems([], [])).toEqual([]);
  });

  it("resolves each ig item's displayUrl the same way igDisplayUrl does", () => {
    const merged = mergeGalleryItems([], [ig[1]]);
    const item = merged[0];
    if (item.source !== "ig") throw new Error("expected an ig item");
    expect(item.displayUrl).toBe("new.jpg");
  });
});
