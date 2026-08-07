import type { ReactNode } from "react";
import { cn } from "./cn";

/*
 * A single-select choice, using the violet "selected = doing now" treatment
 * (PLAN.md §6). Used for flavour and style quick-picks. Occasion uses category
 * colors instead, so it's handled separately.
 */
export function ChoiceChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-[var(--radius-pill)] border px-3 py-1.5 text-xs font-medium transition-colors",
        !selected && "border-hairline text-ink hover:bg-black/[0.03]",
      )}
      style={
        selected
          ? {
              background: "var(--violet-bg)",
              color: "var(--violet-fg)",
              borderColor: "var(--violet-border)",
            }
          : undefined
      }
    >
      {children}
    </button>
  );
}
