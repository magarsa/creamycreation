import { describe, expect, it } from "vitest";
import { ALERT_AFTER_CONSECUTIVE_FAILURES, nextSyncState } from "./sync";

const NOW = new Date("2026-08-08T12:00:00Z");
const ok = { ok: true } as const;
const fail = { ok: false, error: "fetch failed: 503" } as const;

describe("nextSyncState", () => {
  it("resets the streak and stamps success on a good run", () => {
    const next = nextSyncState(
      { consecutive_failures: 5, alerted_at: "2026-08-07T00:00:00Z" },
      ok,
      NOW,
    );
    expect(next.consecutive_failures).toBe(0);
    expect(next.last_error).toBeNull();
    expect(next.last_success_at).toBe(NOW.toISOString());
    expect(next.shouldAlert).toBe(false);
  });

  it("counts failures without alerting below the threshold", () => {
    const first = nextSyncState(null, fail, NOW);
    expect(first.consecutive_failures).toBe(1);
    expect(first.shouldAlert).toBe(false);

    const second = nextSyncState(
      { consecutive_failures: 1, alerted_at: null },
      fail,
      NOW,
    );
    expect(second.consecutive_failures).toBe(2);
    expect(second.shouldAlert).toBe(false);
  });

  it("alerts on the run that reaches the threshold", () => {
    const next = nextSyncState(
      { consecutive_failures: ALERT_AFTER_CONSECUTIVE_FAILURES - 1, alerted_at: null },
      fail,
      NOW,
    );
    expect(next.consecutive_failures).toBe(ALERT_AFTER_CONSECUTIVE_FAILURES);
    expect(next.shouldAlert).toBe(true);
    expect(next.alerted_at).toBe(NOW.toISOString());
  });

  it("does not alert again during the same outage", () => {
    const next = nextSyncState(
      { consecutive_failures: 9, alerted_at: "2026-08-08T09:00:00Z" },
      fail,
      NOW,
    );
    expect(next.consecutive_failures).toBe(10);
    expect(next.shouldAlert).toBe(false);
    expect(next.alerted_at).toBe("2026-08-08T09:00:00Z"); // unchanged
  });

  it("alerts again for a NEW outage after a recovery", () => {
    const recovered = nextSyncState(
      { consecutive_failures: 4, alerted_at: "2026-08-07T00:00:00Z" },
      ok,
      NOW,
    );
    expect(recovered.alerted_at).toBeNull();

    let state = { consecutive_failures: 0, alerted_at: recovered.alerted_at };
    let alerts = 0;
    for (let i = 0; i < ALERT_AFTER_CONSECUTIVE_FAILURES; i++) {
      const next = nextSyncState(state, fail, NOW);
      if (next.shouldAlert) alerts++;
      state = {
        consecutive_failures: next.consecutive_failures,
        alerted_at: next.alerted_at,
      };
    }
    expect(alerts).toBe(1);
  });

  it("truncates a huge error so one bad response cannot bloat the row", () => {
    const next = nextSyncState(null, { ok: false, error: "x".repeat(5000) }, NOW);
    expect(next.last_error).toHaveLength(500);
  });
});
