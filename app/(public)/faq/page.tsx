"use client";

import { useState } from "react";
import { cn } from "@/lib/ui/cn";

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "How far ahead should I order?",
    a: "At least one week. Popular dates fill up, so the earlier the better — especially for weekends and holidays.",
  },
  {
    q: "Do you deliver?",
    a: "Pickup only, from Indian Land, SC. I'll share the pickup window when we confirm your order.",
  },
  {
    q: "How does payment work?",
    a: "There's no payment on this site. After you send an inquiry, we finish the details over Instagram DM and I quote the price there. Nothing is booked until I confirm.",
  },
  {
    q: "Can you make allergy-friendly cakes?",
    a: "Tell me about any allergies in your inquiry or DM. I'll let you know what I can safely make — my kitchen is not allergen-free.",
  },
  {
    q: "Is this a licensed kitchen?",
    a: "[Cottage food disclosure — exact South Carolina DHEC wording to be finalized before launch. This is a compliance requirement, not marketing copy.]",
  },
];

export default function FaqPage() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <main className="flex flex-1 flex-col gap-5 px-[var(--screen-pad)] pb-16 pt-2">
      <h1 className="text-2xl font-bold tracking-[-0.02em]">Good to know</h1>

      <ul className="flex flex-col divide-y divide-hairline border-y border-hairline">
        {FAQS.map((item, i) => {
          const isOpen = open === i;
          return (
            <li key={item.q}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 py-4 text-left"
              >
                <span className="text-sm font-medium">{item.q}</span>
                <span
                  className="shrink-0 text-lg leading-none"
                  style={{ color: isOpen ? "var(--violet-fg)" : "var(--muted)" }}
                >
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              <div
                className={cn(
                  "overflow-hidden text-[14px] leading-relaxed text-muted transition-all",
                  isOpen ? "max-h-60 pb-4" : "max-h-0",
                )}
              >
                {item.a}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
