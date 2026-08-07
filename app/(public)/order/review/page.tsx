"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useOrder } from "@/lib/order/context";
import { OCCASION_LABELS } from "@/lib/domain/order";
import { formatEventDate } from "@/lib/order/format";
import { RESULT_KEY, type OrderResult } from "@/lib/order/result";
import { Button } from "@/lib/ui/button";

export default function ReviewPage() {
  const { draft, update, reset } = useOrder();
  const router = useRouter();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missing = !draft.event_date || !draft.occasion || !draft.size || !draft.flavour;

  async function submit() {
    if (missing) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/submit-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_date: draft.event_date,
          occasion: draft.occasion,
          size: draft.size,
          flavour: draft.flavour,
          message: draft.message ?? "",
          notes: draft.notes ?? "",
          reference_link: draft.reference_link ?? "",
          style_tag: draft.style_tag ?? "",
          preferred_name: draft.preferred_name ?? "",
          ig_handle: draft.ig_handle ?? "",
          photo_paths: draft.photo_paths,
          idempotency_key: idempotencyKey,
        }),
      });

      if (!res.ok) {
        setError(
          res.status === 422
            ? "Something looks off above — check the required fields."
            : "That didn't send. Please try again.",
        );
        setSubmitting(false);
        return;
      }

      const data = (await res.json()) as {
        inquiry_id: string;
        ig_deep_link: string;
      };
      const result: OrderResult = {
        inquiry_id: data.inquiry_id,
        ig_deep_link: data.ig_deep_link,
        event_date: draft.event_date!,
        occasion: draft.occasion!,
        size: draft.size!,
        flavour: draft.flavour!,
      };
      sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
      reset();
      router.push("/order/sent");
    } catch {
      setError("That didn't send. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-[var(--screen-pad)] pb-32 pt-2">
      <h1 className="text-2xl font-bold tracking-[-0.02em]">Before sending</h1>

      <div className="flex flex-col divide-y divide-hairline rounded-[var(--radius-card)] border border-hairline">
        <Row label="Date" value={draft.event_date ? formatEventDate(draft.event_date) : "—"} href="/order/date" />
        <Row label="Occasion" value={draft.occasion ? OCCASION_LABELS[draft.occasion] : "—"} href="/order/details" />
        <Row label="Size" value={draft.size ?? "—"} href="/order/details" />
        <Row label="Flavour" value={draft.flavour ?? "—"} href="/order/details" />
        <Row label="Message" value={draft.message || "None"} href="/order/details" />
        <Row
          label="Inspiration"
          value={
            [
              draft.photo_paths.length
                ? `${draft.photo_paths.length} photo${draft.photo_paths.length === 1 ? "" : "s"}`
                : null,
              draft.reference_link ? "link" : null,
              draft.style_tag ?? null,
            ]
              .filter(Boolean)
              .join(" · ") || "None"
          }
          href="/order/references"
        />
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
            Your name
          </label>
          <input
            type="text"
            value={draft.preferred_name ?? ""}
            onChange={(e) => update({ preferred_name: e.target.value })}
            placeholder="So I know who I'm talking to"
            className="w-full rounded-[var(--radius-control)] border border-hairline bg-screen px-3 py-2.5 text-sm outline-none focus:border-black/30"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
            Instagram handle <span className="normal-case text-muted">(optional)</span>
          </label>
          <input
            type="text"
            value={draft.ig_handle ?? ""}
            onChange={(e) => update({ ig_handle: e.target.value })}
            placeholder="@yourhandle — a backup way to reach you"
            className="w-full rounded-[var(--radius-control)] border border-hairline bg-screen px-3 py-2.5 text-sm outline-none focus:border-black/30"
          />
        </div>
      </section>

      <div
        className="rounded-[var(--radius-card)] px-4 py-3 text-[13px] leading-relaxed"
        style={{ background: "var(--teal-bg)", color: "var(--teal-fg)" }}
      >
        Sending doesn&rsquo;t book the date — I confirm and quote by DM within a day.
      </div>

      <footer className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md border-t border-hairline bg-screen/95 px-[var(--screen-pad)] py-3 backdrop-blur">
        {(missing || error) && (
          <p className="mb-2 text-[13px]" style={{ color: "var(--coral-fg)" }}>
            {missing
              ? "A few required details are still missing above."
              : error}
          </p>
        )}
        <Button
          className="w-full"
          disabled={missing || submitting}
          onClick={submit}
        >
          {submitting ? "Sending…" : "Send in a DM"}
        </Button>
      </footer>
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
  href: Route;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-col">
        <span className="text-[11px] uppercase tracking-[0.06em] text-muted">
          {label}
        </span>
        <span className="truncate text-sm">{value}</span>
      </div>
      <Link
        href={href}
        className="shrink-0 text-[13px] font-medium"
        style={{ color: "var(--violet-fg)" }}
      >
        Edit
      </Link>
    </div>
  );
}
