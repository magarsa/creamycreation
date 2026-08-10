import type { ReactNode } from "react";
import { cn } from "./cn";

/*
 * A single-select list row — the order flow's one selection pattern (occasion,
 * size, flavour, style), replacing the old chip-grid. Monochrome by design: the
 * public site carries exactly one accent (wine), so "selected" is wine text +
 * a checkmark, not a color-coded chip. (The gallery's category badges keep
 * their colors — a different, still-color-coded system — see category-badge.tsx.)
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
        "flex w-full items-center justify-between border-t border-hairline py-2.5 text-left text-[13.5px] last:border-b",
        selected ? "font-semibold" : "text-ink",
      )}
      style={selected ? { color: "var(--wine-fg)" } : undefined}
    >
      <span>{children}</span>
      {selected && <span className="text-xs">✓</span>}
    </button>
  );
}
