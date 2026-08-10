import type { CSSProperties, HTMLAttributes } from "react";
import { cn } from "./cn";

/*
 * Chip is the ONLY sanctioned way to apply state/category color (PLAN.md §6).
 * State variants (wine/coral/amber) each mean one thing; category variants
 * are a separate label-maker system. Feature code passes a variant, never hex.
 */
export type ChipVariant =
  // State
  | "wine" // doing now
  | "coral" // needs attention
  | "amber" // done
  // Category
  | "category-birthday"
  | "category-kids"
  | "category-anniversary"
  | "category-cupcakes"
  | "category-wedding"
  | "category-just_because";

const STYLES: Record<ChipVariant, CSSProperties> = {
  wine: {
    background: "var(--wine-bg)",
    color: "var(--wine-fg)",
    borderColor: "var(--wine-border)",
  },
  coral: {
    background: "var(--coral-bg)",
    color: "var(--coral-fg)",
    borderColor: "var(--coral-border)",
  },
  amber: {
    background: "var(--amber-bg)",
    color: "var(--amber-fg)",
    borderColor: "var(--amber-border)",
  },
  "category-birthday": {
    background: "var(--coral-bg)",
    color: "var(--coral-fg)",
    borderColor: "var(--coral-border)",
  },
  "category-kids": {
    background: "var(--amber-bg)",
    color: "var(--amber-fg)",
    borderColor: "var(--amber-border)",
  },
  "category-anniversary": {
    background: "var(--indigo-bg)",
    color: "var(--indigo-fg)",
    borderColor: "var(--indigo-border)",
  },
  "category-cupcakes": {
    background: "var(--indigo-bg)",
    color: "var(--indigo-fg)",
    borderColor: "var(--indigo-border)",
  },
  "category-wedding": {
    background: "var(--teal-bg)",
    color: "var(--teal-fg)",
    borderColor: "var(--teal-border)",
  },
  "category-just_because": {
    background: "var(--neutral-bg)",
    color: "var(--neutral-fg)",
    borderColor: "var(--neutral-border)",
  },
};

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  variant: ChipVariant;
}

export function Chip({ variant, className, style, ...props }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--radius-pill)] border px-3 py-1 text-xs font-medium",
        className,
      )}
      style={{ ...STYLES[variant], ...style }}
      {...props}
    />
  );
}
