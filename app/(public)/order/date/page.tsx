"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useOrder } from "@/lib/order/context";
import {
  addDaysKey,
  dayState,
  todayKeyInTz,
  type DayState,
} from "@/lib/domain/availability";
import { formatEventDate } from "@/lib/order/format";
import { Button } from "@/lib/ui/button";
import { cn } from "@/lib/ui/cn";

// Stub availability (Phase 1): no blocked dates yet, min-notice from the seeded
// config. Phase 3 swaps in real ICS-driven blocked dates and reads config live.
const TZ = "America/New_York";
const MIN_NOTICE = 7;
const PICKUP = "Sat 10am–2pm";
const MONTHS_AHEAD = 6;
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export default function DatePage() {
  const { draft, update } = useOrder();
  const router = useRouter();

  const todayKey = useMemo(() => todayKeyInTz(TZ), []);
  const [cursor, setCursor] = useState(() => todayKey.slice(0, 7)); // "YYYY-MM"

  const maxMonth = addDaysKey(todayKey, MONTHS_AHEAD * 31).slice(0, 7);
  const canPrev = cursor > todayKey.slice(0, 7);
  const canNext = cursor < maxMonth;

  const cells = useMemo(() => buildGrid(cursor), [cursor]);

  return (
    <main className="flex flex-1 flex-col gap-4 px-[var(--screen-pad)] pb-32 pt-2">
      <h1 className="text-2xl font-bold tracking-[-0.02em]">Pick a date</h1>

      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => setCursor(shiftMonth(cursor, -1))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-lg disabled:opacity-30"
          aria-label="Previous month"
        >
          ←
        </button>
        <span className="text-sm font-semibold">{monthLabel(cursor)}</span>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => setCursor(shiftMonth(cursor, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-lg disabled:opacity-30"
          aria-label="Next month"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((w, i) => (
          <span
            key={i}
            className="py-1 text-center text-[11px] font-medium text-muted"
          >
            {w}
          </span>
        ))}
        {cells.map((cell, i) =>
          cell === null ? (
            <span key={i} />
          ) : (
            <DayCell
              key={cell.key}
              cell={cell}
              state={dayState(cell.key, {
                todayKey,
                minNoticeDays: MIN_NOTICE,
              })}
              selected={draft.event_date === cell.key}
              onSelect={() => update({ event_date: cell.key })}
            />
          ),
        )}
      </div>

      <Legend />

      <footer className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md border-t border-hairline bg-screen/95 px-[var(--screen-pad)] py-3 backdrop-blur">
        {draft.event_date ? (
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm font-medium">
              {formatEventDate(draft.event_date)}
            </span>
            <span className="text-[13px] text-muted">Pickup {PICKUP}</span>
          </div>
        ) : (
          <p className="mb-2 text-[13px] text-muted">
            Choose a pickup day at least a week out.
          </p>
        )}
        <Button
          className="w-full"
          disabled={!draft.event_date}
          onClick={() => router.push("/order/details")}
        >
          Continue
        </Button>
      </footer>
    </main>
  );
}

function DayCell({
  cell,
  state,
  selected,
  onSelect,
}: {
  cell: { key: string; day: number };
  state: DayState;
  selected: boolean;
  onSelect: () => void;
}) {
  const disabled = state === "unavailable";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex aspect-square items-center justify-center rounded-[var(--radius-control)] text-sm",
        disabled && "border border-dashed border-hairline text-muted opacity-45",
        !disabled && !selected && "border border-hairline hover:bg-black/[0.03]",
        selected && "font-semibold",
      )}
      style={
        selected
          ? {
              background: "var(--violet-bg)",
              color: "var(--violet-fg)",
              borderColor: "var(--violet-fg)",
            }
          : undefined
      }
    >
      {cell.day}
    </button>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-full border border-hairline" /> Open
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="h-3 w-3 rounded-full"
          style={{ background: "var(--violet-bg)" }}
        />{" "}
        Selected
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-full border border-dashed border-hairline" />{" "}
        Too soon / booked
      </span>
    </div>
  );
}

// ── date-grid helpers (UTC to avoid TZ drift) ────────────────────────────────
function buildGrid(cursor: string): ({ key: string; day: number } | null)[] {
  const [y, m] = cursor.split("-").map(Number);
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: ({ key: string; day: number } | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ key: `${cursor}-${String(d).padStart(2, "0")}`, day: d });
  }
  return cells;
}

function shiftMonth(cursor: string, delta: number): string {
  const [y, m] = cursor.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(cursor: string): string {
  const [y, m] = cursor.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
