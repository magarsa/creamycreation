import type { ReactNode } from "react";
import Link from "next/link";
import { requireBaker } from "@/lib/auth";
import { bakeryIdentity } from "@/lib/bakery";
import { BakerNav } from "@/lib/ui/baker-nav";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireBaker();
  const { name } = bakeryIdentity();

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-hairline px-[var(--screen-pad)] py-3">
        <Link href="/baker/orders" className="text-sm font-semibold tracking-tight">
          {name} · Baker
        </Link>
        <form action="/auth/signout" method="post">
          <button type="submit" className="text-[13px] text-muted">
            Sign out
          </button>
        </form>
      </header>
      {/* pb clears the now-fixed BakerNav (fixed, not sticky, so it's
          immune to mobile browsers' dynamic-toolbar viewport-height quirk —
          sticky's position depended on this container reliably filling the
          full viewport height, which mobile Safari/Chrome doesn't guarantee
          on first paint before the address bar collapses). */}
      <div className="flex flex-1 flex-col pb-20">{children}</div>
      <BakerNav />
    </div>
  );
}
