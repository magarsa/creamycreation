"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./cn";

const TABS = [
  { href: "/baker/orders", label: "Orders" },
  { href: "/baker/calendar", label: "Calendar" },
  { href: "/baker/cakes", label: "Cakes" },
  { href: "/baker/pricing", label: "Pricing" },
  { href: "/baker/settings", label: "Settings" },
] as const;

export function BakerNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-10 mx-auto flex w-full max-w-md border-t border-hairline bg-screen/95 backdrop-blur">
      {TABS.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "flex-1 py-3 text-center text-[13px] font-medium",
              !active && "text-muted",
            )}
            style={active ? { color: "var(--wine-fg)" } : undefined}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
