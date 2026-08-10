"use client";

import { useRouter } from "next/navigation";
import { useOrder } from "@/lib/order/context";
import {
  CATEGORIES,
  FLAVOURS,
  MAX_MESSAGE_LENGTH,
  OCCASION_LABELS,
  SIZES,
} from "@/lib/domain/order";
import { Button } from "@/lib/ui/button";
import { OptionRow } from "@/lib/ui/option-row";

const inputClass =
  "w-full border-0 border-b border-hairline bg-transparent px-0 py-2 text-sm outline-none placeholder:text-muted focus:border-ink";

export default function DetailsPage() {
  const { draft, update } = useOrder();
  const router = useRouter();

  const ready = Boolean(draft.occasion && draft.size && draft.flavour);

  return (
    <main className="flex flex-1 flex-col gap-5 px-[var(--screen-pad)] pb-32 pt-6">
      <div>
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--wine-fg)" }}>
          The order
        </p>
        <h1 className="font-display text-[26px] italic font-semibold">
          What kind of cake?
        </h1>
      </div>

      <Field label="Occasion">
        <div className="flex flex-col">
          {CATEGORIES.map((c) => (
            <OptionRow
              key={c}
              selected={draft.occasion === c}
              onClick={() => update({ occasion: c })}
            >
              {OCCASION_LABELS[c]}
            </OptionRow>
          ))}
        </div>
      </Field>

      <Field label="Size">
        <div className="flex flex-col">
          {SIZES.map((s) => (
            <OptionRow key={s} selected={draft.size === s} onClick={() => update({ size: s })}>
              {s}
            </OptionRow>
          ))}
        </div>
      </Field>

      <Field label="Flavour">
        <div className="flex flex-col">
          {FLAVOURS.map((f) => (
            <OptionRow
              key={f}
              selected={draft.flavour === f}
              onClick={() => update({ flavour: f })}
            >
              {f}
            </OptionRow>
          ))}
        </div>
      </Field>

      <Field
        label="Message on the cake"
        hint="Piped in buttercream. Leave blank for no message."
      >
        <input
          type="text"
          maxLength={MAX_MESSAGE_LENGTH}
          value={draft.message ?? ""}
          onChange={(e) => update({ message: e.target.value })}
          placeholder="Happy Birthday, Mia!"
          className={inputClass}
        />
      </Field>

      <Field label="Anything else" hint="Allergies, colors, inspiration…">
        <textarea
          rows={3}
          value={draft.notes ?? ""}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder="Pastel colors, no nuts, buttercream not fondant."
          className={`${inputClass} resize-none`}
        />
      </Field>

      <footer className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md border-t border-hairline bg-paper/95 px-[var(--screen-pad)] py-3 backdrop-blur">
        {!ready && (
          <p className="mb-2 text-[13px]" style={{ color: "var(--coral-fg)" }}>
            Pick an occasion, size, and flavour so I know what to plan for.
          </p>
        )}
        <Button
          className="w-full"
          disabled={!ready}
          onClick={() => router.push("/order/references")}
        >
          Next
        </Button>
      </footer>
    </main>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2.5 border-t border-hairline pt-6 first:border-t-0 first:pt-0">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[12px] font-bold uppercase tracking-[0.09em]">
          {label}
        </h2>
        {hint && <p className="text-[12px] text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
