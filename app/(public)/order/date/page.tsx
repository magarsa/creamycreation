import Link from "next/link";
import { getBlockedDates, getPublicConfig } from "@/lib/db/queries";
import { bakeryIdentity } from "@/lib/bakery";
import { addDaysKey, todayKeyInTz } from "@/lib/domain/availability";
import { DatePicker } from "./date-picker";

export const dynamic = "force-dynamic";

const DEFAULT_MIN_NOTICE = 7;
const DEFAULT_PICKUP = "Sat 10am–2pm";
/** Matches the six months the picker lets you page through, plus slack. */
const WINDOW_DAYS = 200;

export default async function DatePage() {
  const { timezone } = bakeryIdentity();
  const todayKey = todayKeyInTz(timezone);

  // The blocked-date cache is only as fresh as the last successful ICS sync
  // (hourly). A booking made minutes ago may not be here yet — the baker is the
  // backstop for that race, and the submit handler re-checks on the server.
  const [config, blockedDates] = await Promise.all([
    getPublicConfig(),
    getBlockedDates(todayKey, addDaysKey(todayKey, WINDOW_DAYS)),
  ]);

  if (config?.vacation_mode) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-[var(--screen-pad)] py-16 text-center">
        <h1 className="text-2xl font-bold tracking-[-0.02em]">
          Away right now
        </h1>
        <p className="max-w-xs text-[15px] leading-relaxed text-muted">
          {config.vacation_message ??
            "Not taking new dates at the moment — check back soon."}
        </p>
        <Link
          href="/cakes"
          className="text-sm font-medium"
          style={{ color: "var(--coral-fg)" }}
        >
          See the cakes →
        </Link>
      </main>
    );
  }

  return (
    <DatePicker
      minNoticeDays={config?.min_notice_days ?? DEFAULT_MIN_NOTICE}
      pickupWindow={config?.pickup_window ?? DEFAULT_PICKUP}
      timezone={timezone}
      blockedDates={blockedDates}
    />
  );
}
