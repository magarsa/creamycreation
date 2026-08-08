"use client";

import { useState } from "react";
import { cn } from "@/lib/ui/cn";

export interface Faq {
  q: string;
  a: string;
}

export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <ul className="flex flex-col divide-y divide-hairline border-y border-hairline">
      {faqs.map((item, i) => {
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
  );
}
