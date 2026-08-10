import { bakeryIdentity } from "@/lib/bakery";
import { FaqAccordion, type Faq } from "./faq-accordion";

export default function FaqPage() {
  const { location } = bakeryIdentity();

  const faqs: Faq[] = [
    {
      q: "How far ahead should I order?",
      a: "At least one week. Popular dates fill up, so the earlier the better — especially for weekends and holidays.",
    },
    {
      q: "Do you deliver?",
      a: `Pickup only, from ${location}. I'll share the pickup window when we confirm your order.`,
    },
    {
      q: "How does payment work?",
      a: "There's no payment on this site. After you send an inquiry, we finish the details over Instagram DM and I quote the price there. Nothing is booked until I confirm.",
    },
    {
      q: "Can you make allergy-friendly cakes?",
      a: "Tell me about any allergies in your inquiry or DM. I'll let you know what I can safely make — my kitchen is not allergen-free.",
    },
    {
      q: "Is this a licensed kitchen?",
      a: "[Cottage food disclosure — exact South Carolina DHEC wording to be finalized before launch. This is a compliance requirement, not marketing copy.]",
    },
  ];

  return (
    <main className="flex flex-1 flex-col gap-5 px-[var(--screen-pad)] pb-16 pt-2">
      <div>
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--wine-fg)" }}>
          Before you ask
        </p>
        <h1 className="font-display text-[26px] italic font-semibold">
          Good to know
        </h1>
      </div>
      <FaqAccordion faqs={faqs} />
    </main>
  );
}
