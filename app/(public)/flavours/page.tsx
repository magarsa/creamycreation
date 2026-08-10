import type { Metadata } from "next";
import { FLAVOURS } from "@/lib/domain/order";
import { formatPriceRange } from "@/lib/domain/pricing";
import { getActiveAddons, getActiveSizes } from "@/lib/db/queries";
import { bakeryIdentity } from "@/lib/bakery";

// Sizes/add-ons are baker-edited and should reflect immediately — same reasoning
// as the order flow's Details page, which reads the same tables.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { name } = bakeryIdentity();
  return {
    title: `Flavours & pricing — ${name}`,
    description:
      "Sizes, flavours, and add-ons. Every cake is custom, so pricing is quoted by DM.",
  };
}

export default async function FlavoursPage() {
  const { location } = bakeryIdentity();
  const [sizes, addons] = await Promise.all([getActiveSizes(), getActiveAddons()]);

  return (
    <main className="flex flex-1 flex-col gap-8 px-[var(--screen-pad)] pb-16 pt-2">
      <div>
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--wine-fg)" }}>
          The menu
        </p>
        <h1 className="font-display text-[26px] italic font-semibold">
          Flavours &amp; pricing
        </h1>
      </div>

      <Section title="Sizes">
        <ul className="flex flex-col divide-y divide-hairline border border-hairline">
          {sizes.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              {s.label}
              <span className="text-[13px] text-muted">
                {formatPriceRange({ minCents: s.base_price_cents, maxCents: s.base_price_cents })}
              </span>
            </li>
          ))}
          {sizes.length === 0 && (
            <li className="px-4 py-3 text-sm text-muted">Coming soon.</li>
          )}
        </ul>
      </Section>

      <Section title="Flavours">
        <ul className="flex flex-col divide-y divide-hairline border border-hairline">
          {FLAVOURS.map((f) => (
            <li key={f} className="px-4 py-3 text-sm">
              {f}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Add-ons">
        <ul className="flex flex-col divide-y divide-hairline border border-hairline">
          {addons.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              {a.label}
              <span className="text-[13px] text-muted">
                {formatPriceRange({ minCents: a.price_min_cents, maxCents: a.price_max_cents })}
              </span>
            </li>
          ))}
          {addons.length === 0 && (
            <li className="px-4 py-3 text-sm text-muted">None right now.</li>
          )}
        </ul>
      </Section>

      <p className="text-[13px] leading-relaxed text-muted">
        Prices are estimates. Pickup only from {location}. Every cake is made
        to order, so I confirm the exact price by DM once we&rsquo;ve talked
        through the details.
      </p>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}
