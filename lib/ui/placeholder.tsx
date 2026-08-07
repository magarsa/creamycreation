import { cn } from "./cn";

/*
 * Grey image slot. Real photography drops in later (PLAN.md §Assets); until then
 * every cake tile is a `--placeholder` rectangle at the right aspect ratio.
 */
export function Placeholder({
  aspect = "4 / 3",
  className,
  label,
}: {
  aspect?: string;
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-[var(--radius-card)] bg-placeholder",
        className,
      )}
      style={{ aspectRatio: aspect }}
    >
      {label ? (
        <span className="px-3 text-center text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
          {label}
        </span>
      ) : null}
    </div>
  );
}
