"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useOrder } from "@/lib/order/context";
import { OCCASION_LABELS } from "@/lib/domain/order";
import { estimateTotal, formatPriceRange } from "@/lib/domain/pricing";
import type { Addon, Size } from "@/lib/db/queries";
import { formatEventDate } from "@/lib/order/format";
import { RESULT_KEY, type OrderResult } from "@/lib/order/result";
import { Button } from "@/lib/ui/button";

const inputClass =
  "w-full border-0 border-b border-hairline bg-transparent px-0 py-2 text-sm outline-none placeholder:text-muted focus:border-ink";

export function ReviewForm({ sizes, addons }: { sizes: Size[]; addons: Addon[] }) {
  const { draft, update, reset } = useOrder();
  const router = useRouter();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Light client-side gate only — the Zod schema on the server is the
  // authoritative validator. This just avoids a pointless round-trip for an
  // obviously-empty or obviously-not-an-email value.
  const emailLooksValid = /^\S+@\S+\.\S+$/.test(draft.email?.trim() ?? "");
  const missing =
    !draft.event_date ||
    !draft.occasion ||
    !draft.size ||
    !draft.flavour ||
    !draft.preferred_name?.trim() ||
    !emailLooksValid;

  const selectedSize = sizes.find((s) => s.label === draft.size);
  const selectedAddons = addons.filter((a) => draft.addon_ids.includes(a.id));
  const estimate = selectedSize
    ? estimateTotal(selectedSize.base_price_cents, selectedAddons)
    : null;

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
          addon_ids: draft.addon_ids,
          message: draft.message ?? "",
          notes: draft.notes ?? "",
          reference_link: draft.reference_link ?? "",
          style_tag: draft.style_tag ?? "",
          preferred_name: draft.preferred_name ?? "",
          email: draft.email ?? "",
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
        estimated_price_min_cents: number | null;
        estimated_price_max_cents: number | null;
      };
      const result: OrderResult = {
        inquiry_id: data.inquiry_id,
        ig_deep_link: data.ig_deep_link,
        event_date: draft.event_date!,
        occasion: draft.occasion!,
        size: draft.size!,
        flavour: draft.flavour!,
        estimated_price_min_cents: data.estimated_price_min_cents,
        estimated_price_max_cents: data.estimated_price_max_cents,
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
    <main className="flex flex-1 flex-col gap-7 px-[var(--screen-pad)] pb-32 pt-6">
      <div>
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--wine-fg)" }}>
          Last look
        </p>
        <h1 className="font-display text-[26px] italic font-semibold">
          Before it sends
        </h1>
      </div>

      <div className="flex flex-col divide-y divide-hairline border border-hairline">
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

      {estimate && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-[12px] font-bold uppercase tracking-[0.09em]">
            Estimate
          </h2>
          <div className="flex flex-col divide-y divide-hairline border border-hairline">
            {selectedSize && (
              <PriceRow
                label={selectedSize.label}
                value={formatPriceRange({
                  minCents: selectedSize.base_price_cents,
                  maxCents: selectedSize.base_price_cents,
                })}
              />
            )}
            {selectedAddons.map((a) => (
              <PriceRow
                key={a.id}
                label={a.label}
                value={formatPriceRange({ minCents: a.price_min_cents, maxCents: a.price_max_cents })}
              />
            ))}
            <PriceRow label="Total" value={formatPriceRange(estimate)} bold />
          </div>
          <p className="text-[12px] text-muted">
            An estimate — I confirm the exact price by DM.
          </p>
        </section>
      )}

      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <label className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">
            Your name
          </label>
          <input
            type="text"
            value={draft.preferred_name ?? ""}
            onChange={(e) => update({ preferred_name: e.target.value })}
            placeholder="So I know who I'm talking to"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">
            Email
          </label>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={draft.email ?? ""}
            onChange={(e) => update({ email: e.target.value })}
            placeholder="So I can reach you if the DM doesn't go through"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">
            Instagram handle <span className="normal-case text-muted">(optional)</span>
          </label>
          <input
            type="text"
            value={draft.ig_handle ?? ""}
            onChange={(e) => update({ ig_handle: e.target.value })}
            placeholder="@yourhandle — a backup way to reach you"
            className={inputClass}
          />
        </div>
      </section>

      <p className="text-[13px] leading-relaxed text-muted">
        Sending doesn&rsquo;t book the date — I confirm and quote by DM within a day.
      </p>

      <footer className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md border-t border-hairline bg-paper/95 px-[var(--screen-pad)] py-3 backdrop-blur">
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
        <span className="text-[10.5px] uppercase tracking-[0.08em] text-muted">
          {label}
        </span>
        <span className="truncate text-sm">{value}</span>
      </div>
      <Link
        href={href}
        className="shrink-0 text-[13px] font-semibold"
        style={{ color: "var(--wine-fg)" }}
      >
        Edit
      </Link>
    </div>
  );
}

function PriceRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <span className={bold ? "font-semibold" : undefined}>{label}</span>
      <span
        className={bold ? "font-semibold" : undefined}
        style={bold ? { color: "var(--wine-fg)" } : undefined}
      >
        {value}
      </span>
    </div>
  );
}
