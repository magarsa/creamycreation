import { describe, expect, it } from "vitest";
import { addDaysKey, dayState, diffDays, todayKeyInTz } from "./availability";

describe("diffDays", () => {
  it("counts whole days between keys", () => {
    expect(diffDays("2026-09-01", "2026-09-08")).toBe(7);
    expect(diffDays("2026-09-08", "2026-09-01")).toBe(-7);
    expect(diffDays("2026-09-01", "2026-09-01")).toBe(0);
  });

  it("handles month boundaries", () => {
    expect(diffDays("2026-08-30", "2026-09-02")).toBe(3);
  });
});

describe("dayState", () => {
  const opts = { todayKey: "2026-09-01", minNoticeDays: 7 };

  it("is unavailable within the min-notice window", () => {
    expect(dayState("2026-09-05", opts)).toBe("unavailable"); // 4 days out
    expect(dayState("2026-09-07", opts)).toBe("unavailable"); // 6 days out
  });

  it("is open exactly at and beyond the min-notice window", () => {
    expect(dayState("2026-09-08", opts)).toBe("open"); // 7 days out
    expect(dayState("2026-10-01", opts)).toBe("open");
  });

  it("is unavailable when the date is blocked, even if beyond min-notice", () => {
    expect(
      dayState("2026-09-20", { ...opts, blockedDates: new Set(["2026-09-20"]) }),
    ).toBe("unavailable");
  });

  it("leaves neighbouring days open — a block covers only its own date", () => {
    const blockedDates = new Set(["2026-09-20"]);
    expect(dayState("2026-09-19", { ...opts, blockedDates })).toBe("open");
    expect(dayState("2026-09-21", { ...opts, blockedDates })).toBe("open");
  });

  it("treats an empty block set the same as no calendar at all", () => {
    expect(dayState("2026-09-20", { ...opts, blockedDates: new Set() })).toBe("open");
    expect(dayState("2026-09-20", opts)).toBe("open");
  });

  it("is unavailable for a past date", () => {
    expect(dayState("2026-08-15", opts)).toBe("unavailable");
  });
});

describe("dayState across the bakery-local midnight", () => {
  // The timezone edge the plan calls out: a customer submitting at 11:55pm ET
  // must see the SAME min-notice cutoff as one submitting five minutes later in
  // UTC terms — because todayKey is resolved in the bakery's zone, not the
  // server's. 2026-08-07T03:55Z is still Aug 6 in New York.
  const instant = new Date("2026-08-07T03:55:00Z");
  const minNoticeDays = 7;

  it("uses the bakery's calendar day, not the server's", () => {
    const bakeryToday = todayKeyInTz("America/New_York", instant);
    const serverToday = todayKeyInTz("UTC", instant);
    expect(bakeryToday).toBe("2026-08-06");
    expect(serverToday).toBe("2026-08-07");

    // Aug 13 is 7 days after Aug 6 → open for the bakery, but only 6 days after
    // Aug 7 → would wrongly read as too-soon if the server's day were used.
    expect(dayState("2026-08-13", { todayKey: bakeryToday, minNoticeDays })).toBe(
      "open",
    );
    expect(dayState("2026-08-13", { todayKey: serverToday, minNoticeDays })).toBe(
      "unavailable",
    );
  });
});

describe("todayKeyInTz", () => {
  it("resolves the bakery-local day across the UTC midnight boundary", () => {
    // 2026-08-07T03:55Z is 2026-08-06 23:55 in America/New_York (EDT, UTC-4).
    const instant = new Date("2026-08-07T03:55:00Z");
    expect(todayKeyInTz("America/New_York", instant)).toBe("2026-08-06");
    expect(todayKeyInTz("UTC", instant)).toBe("2026-08-07");
  });
});

describe("addDaysKey", () => {
  it("adds days across a month boundary", () => {
    expect(addDaysKey("2026-08-30", 3)).toBe("2026-09-02");
    expect(addDaysKey("2026-09-01", -1)).toBe("2026-08-31");
  });
});
