import type { Metadata } from "next";
import { FLAVOURS, SIZES } from "@/lib/domain/order";
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
          {SIZES.map((s) => (
            <li key={s} className="px-4 py-3 text-sm">
              {s}
            </li>
          ))}
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
          {ADDONS.map((a) => (
            <li
              key={a.name}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              {a.name}
              <span
                className="text-[11px] font-medium uppercase tracking-[0.04em]"
                style={a.included ? { color: "var(--wine-fg)" } : undefined}
              >
                {a.included ? "Included" : "Quoted"}
              </span>
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
      <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}
