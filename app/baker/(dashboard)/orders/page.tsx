import Link from "next/link";
import { requireBaker } from "@/lib/auth";
import { OCCASION_LABELS } from "@/lib/domain/order";
import { STATUS_LABELS, STATUS_VARIANT } from "@/lib/domain/status";
import { formatEventDate } from "@/lib/order/format";
import { Chip } from "@/lib/ui/chip";

// Always fresh for the baker — never cache the order list.
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const { supabase } = await requireBaker();
  const { data } = await supabase
    .from("inquiries")
    .select(
      "id, preferred_name, occasion, event_date, size, flavour, status, notification_status, submitted_at",
    )
    .order("submitted_at", { ascending: false });

  const list = data ?? [];
  const newCount = list.filter((i) => i.status === "submitted").length;
  const confirmedCount = list.filter((i) => i.status === "confirmed").length;
  const failed = list.filter((i) => i.notification_status === "failed").length;

  return (
    <main className="flex flex-1 flex-col gap-5 px-[var(--screen-pad)] py-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Orders</h1>
        <p className="text-[13px] text-muted">
          {list.length} total · {newCount} new · {confirmedCount} confirmed
        </p>
      </div>

      {failed > 0 && (
        <div
          className="rounded-[var(--radius-card)] border px-4 py-2.5 text-[13px]"
          style={{
            background: "var(--coral-bg)",
            color: "var(--coral-fg)",
            borderColor: "var(--coral-border)",
          }}
        >
          {failed} {failed === 1 ? "inquiry" : "inquiries"} didn&rsquo;t email
          you — check them below.
        </div>
      )}

      {list.length === 0 ? (
        <p className="text-sm text-muted">No orders yet.</p>
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
