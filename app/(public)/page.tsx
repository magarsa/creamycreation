import Link from "next/link";
import { Button } from "@/lib/ui/button";
import { CakeCard } from "@/lib/ui/cake-card";
import { getActiveCakes } from "@/lib/db/queries";
import { bakeryIdentity } from "@/lib/bakery";

export const revalidate = 3600;

const STRIP = [
  { num: "1", label: "Date" },
  { num: "2", label: "Details" },
  { num: "3", label: "DM & quote" },
];

export default async function Home() {
  const cakes = (await getActiveCakes()).slice(0, 4);
  const { tagline, location } = bakeryIdentity();
  const [taglineFirst, taglineSecond] = tagline.split(". ");

  return (
    <main className="flex flex-1 flex-col pb-16">
      <header className="flex flex-col gap-5 px-[var(--screen-pad)] pt-8">
        <div>
          <h1 className="font-display text-[38px] italic font-semibold leading-[1.05] tracking-[-0.01em] text-balance">
            {taglineFirst}.
            {taglineSecond && (
              <>
                <br />
                {taglineSecond}
              </>
            )}
          </h1>
          <div className="mt-4 h-[2px] w-11" style={{ background: "var(--wine-fg)" }} />
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <Link href="/order/date" className="w-full">
            <Button className="w-full">Check a date</Button>
          </Link>
        </div>
        <p className="text-[11.5px] text-muted">
          No account. No payment here. Custom cakes in {location}, pickup only.
        </p>
      </header>

      <div className="mt-8 flex border-y border-hairline">
        {STRIP.map((s) => (
          <div
            key={s.label}
            className="flex-1 border-l border-hairline py-4 text-center first:border-l-0"
          >
            <div
              className="font-display text-[20px] italic"
              style={{ color: "var(--wine-fg)" }}
            >
              {s.num}
            </div>
            <div className="mt-1 text-[10.5px]">{s.label}</div>
          </div>
        ))}
      </div>

      {cakes.length > 0 && (
        <section className="flex flex-col gap-3 px-[var(--screen-pad)] pt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em]">
              Recent
            </h2>
            <Link
              href="/cakes"
              className="text-[13px] font-semibold"
              style={{ color: "var(--wine-fg)" }}
            >
              All cakes →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {cakes.map((cake) => (
              <CakeCard key={cake.id} cake={cake} />
            ))}
          </div>
        </section>
      )}

      <footer className="mt-10 flex gap-4 border-t border-hairline px-[var(--screen-pad)] pt-5 text-[12px] text-muted">
        <Link href="/flavours">Flavours &amp; pricing</Link>
        <Link href="/faq">Good to know</Link>
      </footer>
    </main>
  );
}
