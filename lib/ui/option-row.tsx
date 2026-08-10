import type { ReactNode } from "react";
import { cn } from "./cn";

/*
 * A single-select list row — the order flow's one selection pattern (occasion,
 * size, flavour, style), replacing the old chip-grid. Monochrome by design: the
 * public site carries exactly one accent (wine), so "selected" is wine text +
 * a checkmark, not a color-coded chip. (The gallery's category badges keep
 * their colors — a different, still-color-coded system — see category-badge.tsx.)
 *
 * The mark on the right is always visible, not just once selected — on a touch
 * device there's no hover to hint "this row does something," so the row needs
 * its own affordance. hover:bg only fires on devices that have a pointer.
 */
export function OptionRow({
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
        "flex w-full items-center justify-between gap-3 border-t border-hairline py-3 text-left text-[13.5px] transition-colors last:border-b hover:bg-black/[0.035]",
        selected ? "font-semibold" : "text-ink",
      )}
      style={selected ? { color: "var(--wine-fg)" } : undefined}
    >
      <span>{children}</span>
      <span
        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center border text-[10px] leading-none transition-colors"
        style={
          selected
            ? { background: "var(--wine-fg)", borderColor: "var(--wine-fg)", color: "#fdf3ee" }
            : { borderColor: "var(--hairline-strong)", color: "transparent" }
        }
        aria-hidden="true"
      >
        ✓
      </span>
    </button>
  );
}
