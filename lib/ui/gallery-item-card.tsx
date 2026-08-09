import Link from "next/link";
import { CategoryBadge } from "./category-badge";
import { Placeholder } from "./placeholder";
import type { GalleryItem } from "@/lib/domain/ig-media";

/**
 * A gallery tile for either source. A curated cake still shows the grey
 * placeholder (no real cake photography yet — see lib/ui/placeholder.tsx) and
 * links to its detail page. An IG post renders its actual synced photo — the
 * first real photos the gallery shows — and links out to the Instagram post
 * itself, since there's no local detail page for it.
 */
export function GalleryItemCard({
  item,
  aspect,
}: {
  item: GalleryItem;
  aspect?: string;
}) {
  if (item.source === "cake") {
    return (
      <Link href={`/cakes/${item.slug}`} className="group flex flex-col gap-2">
        <Placeholder
          aspect={aspect}
          label="photo"
          className="transition-opacity group-hover:opacity-90"
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium leading-snug">{item.title}</span>
          <CategoryBadge category={item.category} className="self-start" />
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={item.permalink}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-2"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- external Instagram CDN URL, not a local asset next/image can optimize */}
      <img
        src={item.displayUrl}
        alt={item.caption ?? "Instagram post"}
        className="w-full rounded-[var(--radius-card)] object-cover transition-opacity group-hover:opacity-90"
        style={{ aspectRatio: aspect ?? "4 / 3" }}
        loading="lazy"
      />
      {item.caption && (
        <span className="line-clamp-2 text-sm leading-snug text-muted">
          {item.caption}
        </span>
      )}
    </Link>
  );
}
