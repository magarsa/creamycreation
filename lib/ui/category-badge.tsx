import { Chip } from "./chip";
import { OCCASION_LABELS, type Category } from "@/lib/domain/order";

/** A category badge — the label-maker system: same tint everywhere (PLAN.md §6). */
export function CategoryBadge({
  category,
  className,
}: {
  category: Category;
  className?: string;
}) {
  return (
    <Chip variant={`category-${category}`} className={className}>
      {OCCASION_LABELS[category]}
    </Chip>
  );
}
