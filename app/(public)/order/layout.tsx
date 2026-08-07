"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { OrderProvider } from "@/lib/order/context";
import { cn } from "@/lib/ui/cn";

const STEPS = [
  { path: "/order/date", label: "Date" },
  { path: "/order/details", label: "Details" },
  { path: "/order/references", label: "Inspiration" },
  { path: "/order/review", label: "Review" },
];

export default function OrderLayout({ children }: { children: ReactNode }) {
  return (
    <OrderProvider>
      <div className="flex flex-1 flex-col">
        <StepBar />
        {children}
      </div>
    </OrderProvider>
  );
}

function StepBar() {
  const pathname = usePathname();
  if (pathname.startsWith("/order/sent")) return null;

  const current = STEPS.findIndex((s) => pathname.startsWith(s.path));
  const step = current === -1 ? 0 : current;

  return (
    <div className="flex flex-col gap-2 px-[var(--screen-pad)] py-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
          {STEPS[step].label}
        </span>
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
          Step {step + 1} of {STEPS.length}
        </span>
      </div>
      <div className="flex gap-1.5">
        {STEPS.map((s, i) => (
          <span
            key={s.path}
            className={cn(
              "h-1 flex-1 rounded-full",
              i < step && "bg-ink",
              i > step && "bg-hairline",
            )}
            style={i === step ? { background: "var(--violet-solid)" } : undefined}
          />
        ))}
      </div>
    </div>
  );
}
