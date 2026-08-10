import Link from "next/link";
import type { ReactNode } from "react";
import { bakeryIdentity } from "@/lib/bakery";

export default function PublicLayout({ children }: { children: ReactNode }) {
  const { name } = bakeryIdentity();
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-hairline px-[var(--screen-pad)] py-4">
        <Link
          href="/"
          className="text-[11px] font-semibold uppercase tracking-[0.08em]"
        >
          {name}
        </Link>
        <Link href="/cakes" className="text-[13px] text-muted">
          The cakes
        </Link>
      </header>
      {children}
    </div>
  );
}
