"use client";

import { useMemo, useState } from "react";
import { CakeCard } from "./cake-card";
import { Chip, type ChipVariant } from "./chip";
import { cn } from "./cn";
import { OCCASION_LABELS, type Category } from "@/lib/domain/order";
import type { Cake } from "@/lib/db/queries";

type Filter = Category | "all";

// All=violet per the design; each category keeps its label-maker tint.
const FILTER_VARIANT: Record<Filter, ChipVariant> = {
  all: "violet",
  birthday: "category-birthday",
  kids: "category-kids",
  anniversary: "category-anniversary",
  wedding: "category-wedding",
  cupcakes: "category-cupcakes",
  just_because: "category-just_because",
};

// Alternating aspect ratios give the masonry columns their varied tile heights.
const ASPECTS = ["4 / 5", "4 / 3"];

export function GalleryGrid({ cakes }: { cakes: Cake[] }) {
  const [active, setActive] = useState<Filter>("all");

  // Only offer filters for categories that actually have cakes.
  const filters = useMemo<Filter[]>(() => {
    const present = new Set(cakes.map((c) => c.category));
    return ["all", ...(Object.keys(OCCASION_LABELS) as Category[]).filter((c) =>
      present.has(c),
    )];
  }, [cakes]);

  const shown =
    active === "all" ? cakes : cakes.filter((c) => c.category === active);

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
        {shown.map((cake, i) => (
          <div key={cake.id} className="mb-3 break-inside-avoid">
            <CakeCard cake={cake} aspect={ASPECTS[i % ASPECTS.length]} />
          </div>
        ))}
      </div>
    </div>
  );
}
