/*
 * Availability computation. Works on date KEYS ("YYYY-MM-DD") rather than Date
 * objects so the logic is timezone-unambiguous and pure. The only timezone-aware
 * piece is `todayKeyInTz`, which turns "now" into the bakery-local calendar day.
 *
 *            ┌ blocked (ICS/manual, Phase 3) ─▶ unavailable
 *   dateKey ─┤ within min-notice window ──────▶ unavailable
 *            └ otherwise ─────────────────────▶ open
 *
 * Phase 1 ships the stub: no blocked dates yet, so every day beyond the
 * min-notice window is "open". Phase 3 passes a populated `blockedDates` set and
 * adds the "one_slot_left" state; the signature already accommodates both.
 */

export type DayState = "open" | "one_slot_left" | "unavailable";

export interface DayStateOptions {
  todayKey: string; // bakery-local "today" as YYYY-MM-DD (see todayKeyInTz)
  minNoticeDays: number;
  blockedDates?: ReadonlySet<string>;
}

export function dayState(dateKey: string, opts: DayStateOptions): DayState {
  if (opts.blockedDates?.has(dateKey)) return "unavailable";
  if (diffDays(opts.todayKey, dateKey) < opts.minNoticeDays) return "unavailable";
  return "open";
}

/** Whole days from `fromKey` to `toKey` (negative if `toKey` is earlier). */
export function diffDays(fromKey: string, toKey: string): number {
  const MS_PER_DAY = 86_400_000;
  return Math.round((keyToUtcMs(toKey) - keyToUtcMs(fromKey)) / MS_PER_DAY);
}

/** The calendar day in `timeZone` for the given instant, as "YYYY-MM-DD". */
export function todayKeyInTz(timeZone: string, now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD, which is exactly the key shape we want.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Add `n` days to a date key, returning a new "YYYY-MM-DD" key. */
export function addDaysKey(dateKey: string, n: number): string {
  const d = new Date(keyToUtcMs(dateKey) + n * 86_400_000);
  return d.toISOString().slice(0, 10);
}

function keyToUtcMs(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}
