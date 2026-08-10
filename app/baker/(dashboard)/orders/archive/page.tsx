import Link from "next/link";
import { requireBaker } from "@/lib/auth";
import { OCCASION_LABELS } from "@/lib/domain/order";
import { STATUS_LABELS, STATUS_VARIANT } from "@/lib/domain/status";
import { formatEventDate } from "@/lib/order/format";
import { Chip } from "@/lib/ui/chip";

export const dynamic = "force-dynamic";

// A generous cap, not real pagination — a one-person shop's lifetime archive
// won't meaningfully exceed this for years, and if it ever does, the newest
// entries (what you actually want to check) are still the ones shown.
const ARCHIVE_LIMIT = 200;

export default async function OrdersArchivePage() {
  const { supabase } = await requireBaker();
  const { data } = await supabase
    .from("inquiries")
    .select(
      "id, preferred_name, occasion, event_date, size, flavour, status, status_changed_at",
    )
    .in("status", ["completed", "cancelled"])
    .order("status_changed_at", { ascending: false })
    .limit(ARCHIVE_LIMIT);

  const list = data ?? [];

  return (
    <main className="flex flex-1 flex-col gap-5 px-[var(--screen-pad)] py-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-[-0.02em]">Archive</h1>
          <Link href="/baker/orders" className="text-[13px] text-muted">
            ← Orders
          </Link>
        </div>
        <p className="text-[13px] text-muted">
          Completed and cancelled orders. {list.length} shown.
        </p>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-muted">Nothing archived yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-hairline rounded-[var(--radius-card)] border border-hairline">
          {list.map((i) => (
            <li key={i.id}>
              <Link
                href={`/baker/orders/${i.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-black/[0.02]"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-sm font-medium">
                    {i.preferred_name}
                  </span>
                  <span className="truncate text-[13px] text-muted">
                    {OCCASION_LABELS[i.occasion]} ·{" "}
                    {formatEventDate(i.event_date)} · {i.size}
                  </span>
                </div>
                <Chip variant={STATUS_VARIANT[i.status]} className="shrink-0">
                  {STATUS_LABELS[i.status]}
                </Chip>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
