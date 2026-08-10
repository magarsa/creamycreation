import type { ReactNode } from "react";
import { cn } from "./cn";

/*
 * A single-select list row — the order flow's one selection pattern (occasion,
 * size, flavour, style), replacing the old chip-grid. Monochrome by design: the
 * public site carries exactly one accent (wine), so "selected" is wine text +
 * a checkmark, not a color-coded chip. (The gallery's category badges keep
 * their colors — a different, still-color-coded system — see category-badge.tsx.)
 *
 * hover:bg is the row's affordance on pointer devices; there's no touch
 * equivalent, which is fine — touch users discover it by tapping, same as any
 * other button.
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
        "flex w-full items-center justify-between gap-3 border-t border-hairline px-3 py-3 text-left text-[13.5px] transition-colors last:border-b hover:bg-black/[0.035]",
        selected ? "font-semibold" : "text-ink",
      )}
      style={selected ? { color: "var(--wine-fg)" } : undefined}
    >
      <span>{children}</span>
      {selected && (
        <span className="text-xs" style={{ color: "var(--wine-fg)" }} aria-hidden="true">
          ✓
        </span>
      )}
    </button>
  );
}
