/*
 * iCalendar (RFC 5545) parsing, reduced to the one question this app asks:
 * "which calendar days are taken?" Pure — no fetch, no DB, no framework — so the
 * cron worker and the test suite run the exact same code.
 *
 *   raw ICS text
 *      │  unfold continuation lines (RFC 5545 §3.1: CRLF + space/tab)
 *      ▼
 *   logical lines ──▶ split on BEGIN/END:VEVENT ──▶ events
 *      │
 *      │  skip STATUS:CANCELLED and events with no DTSTART
 *      ▼
 *   for each event: DTSTART..DTEND ──▶ expand to "YYYY-MM-DD" keys
 *      │
 *      │  all-day (VALUE=DATE): DTEND is EXCLUSIVE  → [start, end)
 *      │  timed:                DTEND is the same instant range → [startDay, endDay]
 *      ▼
 *   clamp to the booking window ──▶ Map<dateKey, reason>
 *
 * Deliberately NOT handled: RRULE. A recurring event in the bookings calendar
 * would block a weekday forever, which is a capacity rule, not a booking — the
 * baker sets those in /baker/settings instead. Recurring events are read as a
 * single occurrence at DTSTART (see expandRecurring note below).
 */

import { addDaysKey, todayKeyInTz } from "./availability";

/** An "all-day" event covers whole calendar days; a timed one has a clock time. */
export interface IcsEvent {
  startKey: string; // "YYYY-MM-DD"
  endKey: string; // INCLUSIVE last day the event occupies
  summary?: string;
}

export interface IcsParseOptions {
  /** Bakery-local zone, used to place UTC instants on the right calendar day. */
  timeZone: string;
  /** Ignore anything before this day (inclusive). */
  fromKey?: string;
  /** Ignore anything after this day (inclusive). */
  toKey?: string;
}

/** Longest run of days a single event may block — guards a runaway DTEND. */
const MAX_EVENT_DAYS = 400;

/**
 * The days the feed says are taken, mapped to the event title that blocked them.
 * Later events win a collision, which only affects the label the baker sees.
 */
export function blockedDatesFromIcs(
  raw: string,
  opts: IcsParseOptions,
): Map<string, string | undefined> {
  const blocked = new Map<string, string | undefined>();
  for (const event of parseIcsEvents(raw, opts)) {
    for (const key of expandDays(event.startKey, event.endKey)) {
      if (opts.fromKey && key < opts.fromKey) continue;
      if (opts.toKey && key > opts.toKey) continue;
      blocked.set(key, event.summary);
    }
  }
  return blocked;
}

/**
 * Does this payload actually look like a calendar?
 *
 * A captive-portal login page, a Google "sorry, this calendar is private" HTML
 * error, or a truncated response all return 200 and parse to ZERO events — which
 * is indistinguishable from "no bookings" and would silently wipe every blocked
 * date. Requiring the VCALENDAR envelope turns that into a sync failure, so the
 * cache is kept and the baker gets told (PLAN.md §5: fail open).
 */
export function isIcsPayload(raw: string): boolean {
  return /^BEGIN:VCALENDAR/im.test(raw);
}

export function parseIcsEvents(raw: string, opts: IcsParseOptions): IcsEvent[] {
  const events: IcsEvent[] = [];
  let current: Record<string, { params: string; value: string }> | null = null;

  for (const line of unfoldLines(raw)) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current) {
        const event = toEvent(current, opts.timeZone);
        if (event) events.push(event);
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const rawName = line.slice(0, colon);
    const semi = rawName.indexOf(";");
    const name = (semi === -1 ? rawName : rawName.slice(0, semi)).toUpperCase();
    current[name] = {
      params: semi === -1 ? "" : rawName.slice(semi + 1).toUpperCase(),
      value: line.slice(colon + 1),
    };
  }

  return events;
}

function toEvent(
  fields: Record<string, { params: string; value: string }>,
  timeZone: string,
): IcsEvent | null {
  if (fields.STATUS?.value.toUpperCase() === "CANCELLED") return null;

  const dtstart = fields.DTSTART;
  if (!dtstart) return null;

  const start = toDateKey(dtstart, timeZone);
  if (!start) return null;

  const summary = fields.SUMMARY ? unescapeText(fields.SUMMARY.value) : undefined;

  const dtend = fields.DTEND;
  if (!dtend) return { startKey: start.key, endKey: start.key, summary };

  const end = toDateKey(dtend, timeZone);
  if (!end) return { startKey: start.key, endKey: start.key, summary };

  // All-day DTEND is exclusive (RFC 5545 §3.8.2.2): a one-day event on the 1st
  // is DTSTART 0901 / DTEND 0902. Timed DTEND is an instant, so the day it lands
  // on is genuinely occupied and stays inclusive.
  const endKey = end.allDay ? addDaysKey(end.key, -1) : end.key;

  // A malformed DTEND before DTSTART degrades to a single day rather than
  // producing an empty or reversed range.
  if (endKey < start.key) return { startKey: start.key, endKey: start.key, summary };

  return { startKey: start.key, endKey, summary };
}

/**
 * A DTSTART/DTEND value reduced to the calendar day it falls on.
 *
 *   20260901                    all-day        → 2026-09-01
 *   20260901T140000             floating/TZID  → 2026-09-01 (local wall time)
 *   20260901T140000Z            UTC instant    → shifted into `timeZone`
 */
function toDateKey(
  field: { params: string; value: string },
  timeZone: string,
): { key: string; allDay: boolean } | null {
  const value = field.value.trim();
  const datePart = value.slice(0, 8);
  if (!/^\d{8}$/.test(datePart)) return null;

  const key = `${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(6, 8)}`;
  const allDay = field.params.includes("VALUE=DATE") || !value.includes("T");
  if (allDay) return { key, allDay: true };

  // A trailing Z means UTC. 2026-09-01T02:00Z is still Aug 31 in New York, so
  // the day has to be resolved in the bakery's zone or late-night events block
  // the wrong date.
  if (value.endsWith("Z")) {
    const ms = Date.UTC(
      Number(datePart.slice(0, 4)),
      Number(datePart.slice(4, 6)) - 1,
      Number(datePart.slice(6, 8)),
      Number(value.slice(9, 11)),
      Number(value.slice(11, 13)),
      Number(value.slice(13, 15)),
    );
    return { key: todayKeyInTz(timeZone, new Date(ms)), allDay: false };
  }

  // TZID or floating: the value is already local wall time, so its date part is
  // the day the baker sees in their own calendar.
  return { key, allDay: false };
}

/** RFC 5545 §3.1 line unfolding, tolerant of both CRLF and bare LF feeds. */
export function unfoldLines(raw: string): string[] {
  const lines: string[] = [];
  for (const line of raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines.map((l) => l.trimEnd()).filter((l) => l.length > 0);
}

/** Inclusive range of date keys, capped so one bad DTEND can't block a decade. */
function expandDays(startKey: string, endKey: string): string[] {
  const days: string[] = [];
  let key = startKey;
  for (let i = 0; i < MAX_EVENT_DAYS && key <= endKey; i++) {
    days.push(key);
    key = addDaysKey(key, 1);
  }
  return days;
}

/** TEXT values escape commas, semicolons and newlines (RFC 5545 §3.3.11). */
function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

