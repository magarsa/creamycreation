import Link from "next/link";
import { requireBaker } from "@/lib/auth";
import { OCCASION_LABELS } from "@/lib/domain/order";
import { formatEventDate } from "@/lib/order/format";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const { supabase } = await requireBaker();
  const { data } = await supabase
    .from("inquiries")
    .select("id, preferred_name, occasion, event_date")
    .eq("notification_status", "failed")
    .order("submitted_at", { ascending: false });

  const list = data ?? [];

  return (
    <main className="flex flex-1 flex-col gap-5 px-[var(--screen-pad)] py-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Un-emailed</h1>
        <p className="text-[13px] text-muted">
          Inquiries where the email to you didn&rsquo;t go through — open each so
          none slip past.
        </p>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-muted">
          All caught up — every inquiry reached your inbox.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-hairline rounded-[var(--radius-card)] border border-hairline">
          {list.map((i) => (
            <li key={i.id}>
              <Link
                href={`/baker/orders/${i.id}`}
                className="flex flex-col gap-1 px-4 py-3 hover:bg-black/[0.02]"
              >
                <span className="text-sm font-medium">{i.preferred_name}</span>
                <span className="text-[13px] text-muted">
                  {OCCASION_LABELS[i.occasion]} ·{" "}
                  {formatEventDate(i.event_date)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
