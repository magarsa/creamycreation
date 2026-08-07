import Link from "next/link";
import { Button } from "@/lib/ui/button";
import { CakeCard } from "@/lib/ui/cake-card";
import { getActiveCakes } from "@/lib/db/queries";

export const revalidate = 3600;

const STEPS = [
  { title: "Pick a date", body: "Choose an available pickup day, at least a week out." },
  { title: "Tell me about it", body: "Occasion, size, flavour, and any inspiration." },
  { title: "I reply in a day", body: "I confirm the details and send a quote by DM." },
];

export default async function Home() {
  const cakes = (await getActiveCakes()).slice(0, 4);

  return (
    <main className="flex flex-1 flex-col gap-12 px-[var(--screen-pad)] pb-16 pt-4">
      <header className="flex flex-col gap-4">
        <h1 className="text-[32px] font-bold leading-[1.05] tracking-[-0.03em]">
          Simple, elegant cakes.
          <br />
          Made one at a time.
        </h1>
        <p className="text-[15px] leading-relaxed text-muted">
          Custom cakes for birthdays, celebrations, and small weddings. Home
          bakery in Indian Land, SC. Pickup only, one week&rsquo;s notice.
        </p>
        <div className="flex flex-col items-start gap-3 pt-1">
          <Link href="/order/date" className="w-full">
            <Button className="w-full">Check availability</Button>
          </Link>
          <Link
            href="/cakes"
            className="text-sm font-medium"
            style={{ color: "var(--coral-fg)" }}
          >
            See the cakes →
          </Link>
        </div>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
          How it works
        </h2>
        <ol className="flex flex-col gap-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                style={
                  i === 0
                    ? { background: "var(--violet-bg)", color: "var(--violet-fg)" }
                    : { background: "var(--neutral-bg)", color: "var(--muted)" }
                }
              >
                {i + 1}
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{step.title}</span>
                <span className="text-[13px] leading-snug text-muted">
                  {step.body}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {cakes.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
              Recent cakes
            </h2>
            <Link
              href="/cakes"
              className="text-[13px] font-medium"
              style={{ color: "var(--coral-fg)" }}
            >
              All →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {cakes.map((cake) => (
              <CakeCard key={cake.id} cake={cake} />
            ))}
          </div>
        </section>
      )}

      <footer className="flex gap-4 border-t border-hairline pt-6 text-[13px] text-muted">
        <Link href="/flavours">Flavours &amp; pricing</Link>
        <Link href="/faq">Good to know</Link>
      </footer>
    </main>
  );
}
