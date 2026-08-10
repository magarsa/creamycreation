"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { OrderProvider } from "@/lib/order/context";
import { bakeryIdentity } from "@/lib/bakery";

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
  const { name } = bakeryIdentity();

  return (
    <div className="flex items-center justify-between border-b border-hairline px-[var(--screen-pad)] py-3.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em]">
        {name}
      </span>
      <span className="text-[11px] text-muted">
        Step {step + 1} of {STEPS.length} &middot; {STEPS[step].label}
      </span>
    </div>
  );
}
