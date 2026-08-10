"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OCCASION_LABELS } from "@/lib/domain/order";
import { formatPriceRange } from "@/lib/domain/pricing";
import { formatEventDate } from "@/lib/order/format";
import { RESULT_KEY, type OrderResult } from "@/lib/order/result";

const PICKUP = "Sat 10am–2pm";

const TIPS = [
  "Send reference photos in the DM if you have them.",
  "Mention any allergies now so I can plan around them.",
];

export default function SentPage() {
  const router = useRouter();
  const [result, setResult] = useState<OrderResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(RESULT_KEY);
    if (!raw) {
      router.replace("/");
      return;
    }
    try {
      // One-time read of the just-submitted result from client-only storage.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResult(JSON.parse(raw) as OrderResult);
    } catch {
      router.replace("/");
    }
  }, [router]);

  if (!result) return null;

  const copyText =
    new URL(result.ig_deep_link).searchParams.get("text") ?? "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the DM link still works */
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-7 px-[var(--screen-pad)] pb-32 pt-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <span
          className="flex h-11 w-11 items-center justify-center border text-lg"
          style={{ borderColor: "var(--wine-fg)", color: "var(--wine-fg)" }}
        >
          ✓
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[26px] italic font-semibold">
            Request sent
          </h1>
          <p className="max-w-xs text-[15px] leading-relaxed text-muted">
            Finish in a DM and I&rsquo;ll reply within a day. Nothing is booked
            until I confirm and quote.
          </p>
        </div>
      </div>

      <div className="flex flex-col divide-y divide-hairline border border-hairline">
        <SummaryRow label="Date" value={formatEventDate(result.event_date)} />
        <SummaryRow label="Occasion" value={OCCASION_LABELS[result.occasion]} />
        <SummaryRow label="Size" value={result.size} />
        <SummaryRow label="Flavour" value={result.flavour} />
        {result.estimated_price_min_cents != null &&
          result.estimated_price_max_cents != null && (
            <SummaryRow
              label="Estimate"
              value={formatPriceRange({
                minCents: result.estimated_price_min_cents,
                maxCents: result.estimated_price_max_cents,
              })}
            />
          )}
        <SummaryRow label="Pickup" value={PICKUP} />
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">
          While you wait
        </h2>
        <ul className="flex flex-col gap-1.5">
          {TIPS.map((t) => (
            <li key={t} className="flex gap-2 text-[13px] text-muted">
              <span style={{ color: "var(--wine-fg)" }}>—</span>
              {t}
            </li>
          ))}
        </ul>
      </section>

      <footer className="fixed inset-x-0 bottom-0 mx-auto flex w-full max-w-md flex-col gap-2 border-t border-hairline bg-paper/95 px-[var(--screen-pad)] py-3 backdrop-blur">
        <a
          href={result.ig_deep_link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center bg-ink px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Open the DM
        </a>
        <button
          type="button"
          onClick={copy}
          className="inline-flex w-full items-center justify-center border border-hairline px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-black/[0.03]"
        >
          {copied ? "Copied ✓" : "Copy details"}
        </button>
      </footer>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-[10.5px] uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
