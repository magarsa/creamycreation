import Link from "next/link";
import { CategoryBadge } from "./category-badge";
import { Placeholder } from "./placeholder";
import type { Cake } from "@/lib/db/queries";

/** A gallery tile linking to the cake detail page. `aspect` varies for masonry. */
export function CakeCard({ cake, aspect }: { cake: Cake; aspect?: string }) {
  return (
    <Link href={`/cakes/${cake.slug}`} className="group flex flex-col gap-2">
      <Placeholder
        aspect={aspect}
        label="photo"
        className="transition-opacity group-hover:opacity-90"
      />
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium leading-snug">{cake.title}</span>
        <CategoryBadge category={cake.category} className="self-start" />
      </div>
    </Link>
  );
}
