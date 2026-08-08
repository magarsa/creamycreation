import type { Metadata } from "next";
import { FLAVOURS, SIZES } from "@/lib/domain/order";
import { Chip } from "@/lib/ui/chip";
import { bakeryIdentity } from "@/lib/bakery";

export async function generateMetadata(): Promise<Metadata> {
  const { name } = bakeryIdentity();
  return {
    title: `Flavours & pricing — ${name}`,
    description:
      "Sizes, flavours, and add-ons. Every cake is custom, so pricing is quoted by DM.",
  };
}

const ADDONS: Array<{ name: string; included?: boolean }> = [
  { name: "Buttercream finish", included: true },
  { name: "Fresh flowers" },
  { name: "Custom topper" },
  { name: "Extra tier" },
];

export default function FlavoursPage() {
  const { location } = bakeryIdentity();
  return (
    <main className="flex flex-1 flex-col gap-8 px-[var(--screen-pad)] pb-16 pt-2">
      <h1 className="text-2xl font-bold tracking-[-0.02em]">Flavours &amp; pricing</h1>

      <Section title="Sizes">
        <ul className="flex flex-col divide-y divide-hairline rounded-[var(--radius-card)] border border-hairline">
          {SIZES.map((s) => (
            <li key={s} className="px-4 py-3 text-sm">
              {s}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Flavours">
        <div className="flex flex-wrap gap-2">
          {FLAVOURS.map((f) => (
            <span
              key={f}
              className="rounded-[var(--radius-pill)] px-3 py-1 text-xs font-medium"
              style={{ background: "var(--neutral-bg)", color: "var(--neutral-fg)" }}
            >
              {f}
            </span>
          ))}
        </div>
      </Section>

      <Section title="Add-ons">
        <ul className="flex flex-col divide-y divide-hairline rounded-[var(--radius-card)] border border-hairline">
          {ADDONS.map((a) => (
            <li
              key={a.name}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              {a.name}
              {a.included ? (
                <Chip variant="amber">Included</Chip>
              ) : (
                <span className="text-[13px] text-muted">Quoted</span>
              )}
            </li>
          ))}
        </ul>
      </Section>

      <p className="text-[13px] leading-relaxed text-muted">
        Pickup only from {location}. Every cake is made to order, so final
        pricing is quoted by DM once we&rsquo;ve talked through the details.
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
      <h2 className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}
