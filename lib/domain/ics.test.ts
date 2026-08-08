import { describe, expect, it } from "vitest";
import { blockedDatesFromIcs, parseIcsEvents, unfoldLines } from "./ics";

const TZ = "America/New_York";

/** Wraps VEVENT bodies in a minimal VCALENDAR, CRLF-terminated like real feeds. */
function feed(...events: string[]): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Google Inc//Google Calendar 70.9054//EN",
    ...events.flatMap((e) => ["BEGIN:VEVENT", ...e.trim().split("\n"), "END:VEVENT"]),
    "END:VCALENDAR",
  ].join("\r\n");
}

describe("unfoldLines", () => {
  it("joins continuation lines onto the preceding line", () => {
    const raw = "SUMMARY:Wedding cake for the\r\n  Patel family\r\nDTSTART:20260901";
    expect(unfoldLines(raw)).toEqual([
      "SUMMARY:Wedding cake for the Patel family",
      "DTSTART:20260901",
    ]);
  });

  it("handles tab-folded lines and bare LF feeds", () => {
    expect(unfoldLines("SUMMARY:one\n\ttwo")).toEqual(["SUMMARY:onetwo"]);
  });
});

describe("parseIcsEvents", () => {
  it("reads an all-day event, treating DTEND as exclusive", () => {
    const events = parseIcsEvents(
      feed("DTSTART;VALUE=DATE:20260901\nDTEND;VALUE=DATE:20260902\nSUMMARY:Chen order"),
      { timeZone: TZ },
    );
    expect(events).toEqual([
      { startKey: "2026-09-01", endKey: "2026-09-01", summary: "Chen order" },
    ]);
  });

  it("spans a multi-day all-day event", () => {
    const [event] = parseIcsEvents(
      feed("DTSTART;VALUE=DATE:20260901\nDTEND;VALUE=DATE:20260904"),
      { timeZone: TZ },
    );
    expect(event).toMatchObject({ startKey: "2026-09-01", endKey: "2026-09-03" });
  });

  it("keeps DTEND inclusive for timed events", () => {
    const [event] = parseIcsEvents(
      feed("DTSTART;TZID=America/New_York:20260901T140000\nDTEND;TZID=America/New_York:20260901T170000"),
      { timeZone: TZ },
    );
    expect(event).toMatchObject({ startKey: "2026-09-01", endKey: "2026-09-01" });
  });

  it("places a UTC instant on the bakery-local day, not the UTC one", () => {
    // 2026-09-01T02:00Z is still Aug 31, 10pm in New York.
    const [event] = parseIcsEvents(feed("DTSTART:20260901T020000Z"), {
      timeZone: TZ,
    });
    expect(event.startKey).toBe("2026-08-31");

    const [utcEvent] = parseIcsEvents(feed("DTSTART:20260901T020000Z"), {
      timeZone: "UTC",
    });
    expect(utcEvent.startKey).toBe("2026-09-01");
  });

  it("falls back to a single day when DTEND is missing or reversed", () => {
    const [noEnd] = parseIcsEvents(feed("DTSTART;VALUE=DATE:20260901"), {
      timeZone: TZ,
    });
    expect(noEnd).toMatchObject({ startKey: "2026-09-01", endKey: "2026-09-01" });

    const [reversed] = parseIcsEvents(
      feed("DTSTART;VALUE=DATE:20260910\nDTEND;VALUE=DATE:20260901"),
      { timeZone: TZ },
    );
    expect(reversed).toMatchObject({ startKey: "2026-09-10", endKey: "2026-09-10" });
  });

  it("skips cancelled events and events with no usable DTSTART", () => {
    const events = parseIcsEvents(
      feed(
        "DTSTART;VALUE=DATE:20260901\nSTATUS:CANCELLED\nSUMMARY:Called off",
        "SUMMARY:No date at all",
        "DTSTART;VALUE=DATE:not-a-date",
        "DTSTART;VALUE=DATE:20260905\nSUMMARY:Real one",
      ),
      { timeZone: TZ },
    );
    expect(events).toHaveLength(1);
    expect(events[0].summary).toBe("Real one");
  });

  it("unescapes escaped text in the summary", () => {
    const [event] = parseIcsEvents(
      feed('DTSTART;VALUE=DATE:20260901\nSUMMARY:Cake for Ada\\, 8" round\\nrush'),
      { timeZone: TZ },
    );
    expect(event.summary).toBe('Cake for Ada, 8" round rush');
  });
});

describe("blockedDatesFromIcs", () => {
  const raw = feed(
    "DTSTART;VALUE=DATE:20260901\nDTEND;VALUE=DATE:20260904\nSUMMARY:Wedding week",
    "DTSTART;VALUE=DATE:20260920\nSUMMARY:Chen order",
  );

  it("expands every occupied day, labelled with its event", () => {
    const blocked = blockedDatesFromIcs(raw, { timeZone: TZ });
    expect([...blocked.keys()].sort()).toEqual([
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-20",
    ]);
    expect(blocked.get("2026-09-02")).toBe("Wedding week");
  });

  it("clamps to the booking window", () => {
    const blocked = blockedDatesFromIcs(raw, {
      timeZone: TZ,
      fromKey: "2026-09-02",
      toKey: "2026-09-10",
    });
    expect([...blocked.keys()].sort()).toEqual(["2026-09-02", "2026-09-03"]);
  });

  it("returns nothing for an empty or non-calendar payload", () => {
    expect(blockedDatesFromIcs("", { timeZone: TZ }).size).toBe(0);
    expect(blockedDatesFromIcs("<html>404</html>", { timeZone: TZ }).size).toBe(0);
  });

  it("caps a runaway DTEND instead of blocking forever", () => {
    const runaway = feed("DTSTART;VALUE=DATE:20260901\nDTEND;VALUE=DATE:21000101");
    expect(blockedDatesFromIcs(runaway, { timeZone: TZ }).size).toBe(400);
  });
});
