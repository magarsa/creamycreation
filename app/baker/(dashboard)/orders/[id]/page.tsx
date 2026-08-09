import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBaker } from "@/lib/auth";
import { OCCASION_LABELS } from "@/lib/domain/order";
import {
  STATUS_FLOW,
  STATUS_LABELS,
  STATUS_VARIANT,
} from "@/lib/domain/status";
import { formatEventDate } from "@/lib/order/format";
import { Chip } from "@/lib/ui/chip";
import { updateStatus, saveNotes } from "./actions";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireBaker();

  const { data: inquiry } = await supabase
    .from("inquiries")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!inquiry) notFound();

  const { data: photoRows } = await supabase
    .from("inquiry_photos")
    .select("storage_path")
    .eq("inquiry_id", id)
    .order("sort_order");

  // Signed URLs for the private reference photos (baker-only).
  const photos: string[] = [];
  for (const p of photoRows ?? []) {
    const { data } = await supabase.storage
      .from("inquiry-photos")
      .createSignedUrl(p.storage_path, 3600);
    if (data?.signedUrl) photos.push(data.signedUrl);
  }

  const nextStatuses = STATUS_FLOW[inquiry.status];

  return (
    <main className="flex flex-1 flex-col gap-6 px-[var(--screen-pad)] py-5">
      <div className="flex flex-col gap-2">
        <Link href="/baker/orders" className="text-[13px] text-muted">
          ← Orders
        </Link>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-[-0.02em]">
            {inquiry.preferred_name}
          </h1>
          <Chip variant={STATUS_VARIANT[inquiry.status]}>
            {STATUS_LABELS[inquiry.status]}
          </Chip>
        </div>
        {inquiry.notification_status === "failed" && (
          <p className="text-[13px]" style={{ color: "var(--coral-fg)" }}>
            The notification email to you failed — this order only lives here.
          </p>
        )}
      </div>

      {/* Status controls */}
      {nextStatuses.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
            Move to
          </h2>
          <form action={updateStatus} className="flex flex-wrap gap-2">
            <input type="hidden" name="id" value={inquiry.id} />
            {nextStatuses.map((to) => (
              <button
                key={to}
                type="submit"
                name="to"
                value={to}
                className="rounded-[var(--radius-pill)] border border-hairline px-3 py-1.5 text-xs font-medium text-ink hover:bg-black/[0.03]"
              >
                {STATUS_LABELS[to]}
              </button>
            ))}
          </form>
        </section>
      )}

      {/* Details */}
      <section className="flex flex-col divide-y divide-hairline rounded-[var(--radius-card)] border border-hairline">
        <Row
          label="Email"
          value={inquiry.email || "—"}
          href={inquiry.email ? `mailto:${inquiry.email}` : undefined}
        />
        <Row label="Date" value={formatEventDate(inquiry.event_date)} />
        <Row label="Occasion" value={OCCASION_LABELS[inquiry.occasion]} />
        <Row label="Size" value={inquiry.size} />
        <Row label="Flavour" value={inquiry.flavour} />
        <Row label="Message" value={inquiry.message || "—"} />
        <Row label="Notes" value={inquiry.notes || "—"} />
        <Row label="Style" value={inquiry.style_tag || "—"} />
        <Row
          label="Inspiration link"
          value={inquiry.reference_link || "—"}
          href={inquiry.reference_link ?? undefined}
        />
        <Row label="Instagram" value={inquiry.ig_handle || "—"} />
      </section>

      {/* Reference photos */}
      {photos.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
            Reference photos
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt={`reference ${i + 1}`}
                className="aspect-square w-full rounded-[var(--radius-control)] object-cover"
              />
            ))}
          </div>
        </section>
      )}

      {/* Internal notes */}
      <section className="flex flex-col gap-2">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
          Private notes
        </h2>
        <form action={saveNotes} className="flex flex-col gap-2">
          <input type="hidden" name="id" value={inquiry.id} />
          <textarea
            name="internal_notes"
            rows={3}
            defaultValue={inquiry.internal_notes ?? ""}
            placeholder="Only you see this — quote, ingredients, reminders…"
            className="w-full resize-none rounded-[var(--radius-control)] border border-hairline bg-screen px-3 py-2.5 text-sm outline-none focus:border-black/30"
          />
          <button
            type="submit"
            className="self-start rounded-[var(--radius-control)] border border-hairline px-3 py-1.5 text-xs font-medium hover:bg-black/[0.03]"
          >
            Save note
          </button>
        </form>
      </section>
    </main>
  );
}

function Row({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      <span className="shrink-0 text-[11px] uppercase tracking-[0.06em] text-muted">
        {label}
      </span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="max-w-[60%] truncate text-right text-sm"
          style={{ color: "var(--violet-fg)" }}
        >
          {value}
        </a>
      ) : (
        <span className="max-w-[60%] text-right text-sm">{value}</span>
      )}
    </div>
  );
}
