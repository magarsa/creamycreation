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
      <div className="flex flex-1 flex-col">{children}</div>
      <BakerNav />
    </div>
  );
}
