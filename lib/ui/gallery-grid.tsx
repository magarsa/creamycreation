"use client";

import { useMemo, useState } from "react";
import { GalleryItemCard } from "./gallery-item-card";
import { Chip, type ChipVariant } from "./chip";
import { cn } from "./cn";
import { OCCASION_LABELS, type Category } from "@/lib/domain/order";
import type { GalleryItem } from "@/lib/domain/ig-media";

type Filter = Category | "all";

// All=wine per the design; each category keeps its label-maker tint.
const FILTER_VARIANT: Record<Filter, ChipVariant> = {
  all: "wine",
  birthday: "category-birthday",
  kids: "category-kids",
  anniversary: "category-anniversary",
  wedding: "category-wedding",
  cupcakes: "category-cupcakes",
  just_because: "category-just_because",
};

// Alternating aspect ratios give the masonry columns their varied tile heights.
const ASPECTS = ["4 / 5", "4 / 3"];

export function GalleryGrid({ items }: { items: GalleryItem[] }) {
  const [active, setActive] = useState<Filter>("all");

  // Only offer filters for categories that actually have cakes. IG posts have
  // no category (mergeGalleryItems' contract), so they never add a filter and
  // only ever show under "All" — see the shown[] filter below.
  const filters = useMemo<Filter[]>(() => {
    const present = new Set(
      items.flatMap((i) => (i.source === "cake" ? [i.category] : [])),
    );
    return ["all", ...(Object.keys(OCCASION_LABELS) as Category[]).filter((c) =>
      present.has(c),
    )];
  }, [items]);

  const shown =
    active === "all"
      ? items
      : items.filter((i) => i.source === "cake" && i.category === active);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setActive(f)}
            aria-pressed={active === f}
            className={cn(
              "rounded-[var(--radius-pill)] transition-opacity",
              active === f
                ? "opacity-100 ring-1 ring-black/10"
                : "opacity-55 hover:opacity-80",
            )}
          >
            <Chip variant={FILTER_VARIANT[f]}>
              {f === "all" ? "All" : OCCASION_LABELS[f]}
            </Chip>
          </button>
        ))}
      </div>

      <div className="columns-2 gap-3">
        {shown.map((item, i) => (
          <div key={`${item.source}-${item.id}`} className="mb-3 break-inside-avoid">
            <GalleryItemCard item={item} aspect={ASPECTS[i % ASPECTS.length]} />
          </div>
        ))}
      </div>
    </div>
  );
}
