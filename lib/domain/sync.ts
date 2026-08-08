/*
 * Sync health bookkeeping — the fail-open policy from PLAN.md §5, as a pure
 * function so the "when do we shout?" rule is testable without a network, a
 * clock, or a database.
 *
 *   attempt ──┬── ok ────▶ failures := 0, clear the error, clear alerted_at
 *             │            (blocked_dates were just rebuilt)
 *             └── fail ──▶ failures += 1, KEEP the cached blocked_dates
 *                          │
 *                          └── failures >= 3 and not yet alerted for THIS
 *                              streak ──▶ email the baker, stamp alerted_at
 *
 * Failing open matters: a dead ICS feed must never silently open every date on
 * the calendar, and it must never spam the baker hourly either — one alert per
 * outage, and the counter resets only on a genuine success.
 */

export const ALERT_AFTER_CONSECUTIVE_FAILURES = 3;

export interface SyncState {
  consecutive_failures: number;
  alerted_at: string | null;
}

export interface SyncOutcome {
  consecutive_failures: number;
  last_error: string | null;
  last_attempt_at: string;
  last_success_at?: string;
  alerted_at: string | null;
  /** True on exactly the attempt that crosses the threshold, once per outage. */
  shouldAlert: boolean;
}

export function nextSyncState(
  prev: SyncState | null,
  result: { ok: true } | { ok: false; error: string },
  now: Date = new Date(),
): SyncOutcome {
  const at = now.toISOString();

  if (result.ok) {
    return {
      consecutive_failures: 0,
      last_error: null,
      last_attempt_at: at,
      last_success_at: at,
      alerted_at: null, // a recovery ends the streak, so the next outage alerts again
      shouldAlert: false,
    };
  }

  const failures = (prev?.consecutive_failures ?? 0) + 1;
  const alreadyAlerted = prev?.alerted_at != null;
  const shouldAlert = failures >= ALERT_AFTER_CONSECUTIVE_FAILURES && !alreadyAlerted;

  return {
    consecutive_failures: failures,
    last_error: result.error.slice(0, 500),
    last_attempt_at: at,
    alerted_at: shouldAlert ? at : (prev?.alerted_at ?? null),
    shouldAlert,
  };
}
