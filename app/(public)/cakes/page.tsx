import type { Metadata } from "next";
import { GalleryGrid } from "@/lib/ui/gallery-grid";
import { getActiveCakes, getVisibleIgMedia } from "@/lib/db/queries";
import { bakeryIdentity } from "@/lib/bakery";
import { mergeGalleryItems } from "@/lib/domain/ig-media";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { name } = bakeryIdentity();
  return {
    title: `The cakes — ${name}`,
    description:
      "A gallery of custom cakes for birthdays, celebrations, and small weddings.",
  };
}

export default async function GalleryPage() {
  const [cakes, igMedia] = await Promise.all([getActiveCakes(), getVisibleIgMedia()]);
  const items = mergeGalleryItems(
    cakes,
    igMedia.map((m) => ({
      id: m.id,
      caption: m.caption,
      permalink: m.permalink,
      mediaUrl: m.media_url,
      thumbnailUrl: m.thumbnail_url,
      postedAt: m.posted_at,
    })),
  );

  return (
    <main className="flex flex-1 flex-col gap-5 px-[var(--screen-pad)] pb-16 pt-2">
      <div className="flex flex-col gap-1">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--wine-fg)" }}>
          The gallery
        </p>
        <h1 className="font-display text-[26px] italic font-semibold">
          A few recent bakes
        </h1>
        <p className="text-[13px] text-muted">Yours is made to order.</p>
      </div>

      {items.length > 0 ? (
        <GalleryGrid items={items} />
      ) : (
        <p className="text-sm text-muted">New cakes coming soon.</p>
      )}
    </main>
  );
}
