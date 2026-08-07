import Link from "next/link";
import { getPublicConfig } from "@/lib/db/queries";
import { DatePicker } from "./date-picker";

export const dynamic = "force-dynamic";

const DEFAULT_MIN_NOTICE = 7;
const DEFAULT_PICKUP = "Sat 10am–2pm";

export default async function DatePage() {
  const config = await getPublicConfig();

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
    />
  );
}
