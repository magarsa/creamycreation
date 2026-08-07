import Link from "next/link";
import type { ReactNode } from "react";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col">
      <header className="flex items-center justify-between px-[var(--screen-pad)] py-4">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Creamy Creation
        </Link>
        <Link href="/cakes" className="text-[13px] text-muted">
          The cakes
        </Link>
      </header>
      {children}
    </div>
  );
}
