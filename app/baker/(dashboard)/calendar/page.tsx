import { requireBaker } from "@/lib/auth";
import { bakeryIdentity } from "@/lib/bakery";
import { addDaysKey, todayKeyInTz } from "@/lib/domain/availability";
import { ALERT_AFTER_CONSECUTIVE_FAILURES } from "@/lib/domain/sync";
import { formatEventDate } from "@/lib/order/format";

export const dynamic = "force-dynamic";

/*
 * Read-only view of what the public picker has greyed out, and whether the feed
 * that fills it is healthy. Read-only on purpose (ROADMAP Phase 3): the calendar
 * is the source of truth, so the fix for a wrong date is to edit the calendar,
 * not to edit a cache that the next sync overwrites.
 */
const WINDOW_DAYS = 200;

export default async function CalendarPage() {
  const { supabase } = await requireBaker();
  const todayKey = todayKeyInTz(bakeryIdentity().timezone);

  const [{ data: blocked }, { data: sync }] = await Promise.all([
    supabase
      .from("blocked_dates")
      .select("blocked_date, reason, source")
      .gte("blocked_date", todayKey)
      .lte("blocked_date", addDaysKey(todayKey, WINDOW_DAYS))
      .order("blocked_date", { ascending: true }),
    supabase.from("sync_state").select("*").eq("job", "ics").maybeSingle(),
  ]);

  const dates = blocked ?? [];
  const months = groupByMonth(dates);

  return (
    <main className="flex flex-1 flex-col gap-6 px-[var(--screen-pad)] py-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Calendar</h1>
        <p className="text-[13px] text-muted">
          Days your booking calendar has taken. Customers can&rsquo;t pick these.
          To change one, edit the event in your calendar — this updates on its own.
        </p>
      </div>

      <SyncHealth sync={sync} />

      {months.length === 0 ? (
        <p className="text-sm text-muted">
          Nothing blocked in the next {WINDOW_DAYS} days — every day past your
          minimum notice is bookable.
        </p>
      ) : (
        months.map(([month, rows]) => (
          <section key={month} className="flex flex-col gap-2">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
              {month}
            </h2>
            <ul className="flex flex-col divide-y divide-hairline rounded-[var(--radius-card)] border border-hairline">
              {rows.map((row) => (
                <li
                  key={row.blocked_date}
                  className="flex items-baseline justify-between gap-3 px-4 py-3"
                >
                  <span className="text-sm font-medium">
                    {formatEventDate(row.blocked_date)}
                  </span>
                  <span className="truncate text-[13px] text-muted">
                    {row.reason ?? (row.source === "manual" ? "Blocked by you" : "Busy")}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}

type SyncRow = {
  last_success_at: string | null;
  last_attempt_at: string | null;
  consecutive_failures: number;
  last_error: string | null;
} | null;

function SyncHealth({ sync }: { sync: SyncRow }) {
  const failing =
    (sync?.consecutive_failures ?? 0) >= ALERT_AFTER_CONSECUTIVE_FAILURES;
  const neverRan = !sync?.last_success_at;

  // The stale case is the one that matters: dates keep showing as blocked from
  // the last good sync, so the site looks fine while new bookings aren't landing.
  if (failing || neverRan) {
    return (
      <div
        className="flex flex-col gap-1.5 rounded-[var(--radius-card)] border px-4 py-3"
        style={{ borderColor: "var(--coral-fg)", background: "var(--coral-bg)" }}
      >
        <span className="text-sm font-semibold" style={{ color: "var(--coral-fg)" }}>
          {neverRan ? "Calendar not connected yet" : "Calendar sync is failing"}
        </span>
        <span className="text-[13px]">
          {neverRan
            ? "No successful sync yet. Until the calendar link is set up, only your minimum-notice rule limits which days customers can pick."
            : `Failed ${sync?.consecutive_failures} times in a row. The dates below are from the last good sync — anything you've booked since then is NOT blocked on the site.`}
        </span>
        {sync?.last_error && (
          <span className="text-[12px] text-muted">{sync.last_error}</span>
        )}
      </div>
    );
  }

  return (
    <p className="text-[13px] text-muted">
      Last synced {formatWhen(sync?.last_success_at)}. Checks hourly.
    </p>
  );
}

function groupByMonth<T extends { blocked_date: string }>(rows: T[]): [string, T[]][] {
  const months = new Map<string, T[]>();
  for (const row of rows) {
    const key = monthLabel(row.blocked_date);
    const list = months.get(key);
    if (list) list.push(row);
    else months.set(key, [row]);
  }
  return [...months];
}

function monthLabel(dateKey: string): string {
  const [y, m] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "never";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 2) return "just now";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
