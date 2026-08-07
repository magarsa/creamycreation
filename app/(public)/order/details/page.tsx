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
import { Chip } from "@/lib/ui/chip";
import { ChoiceChip } from "@/lib/ui/choice-chip";
import { cn } from "@/lib/ui/cn";

export default function DetailsPage() {
  const { draft, update } = useOrder();
  const router = useRouter();

  const ready = Boolean(draft.occasion && draft.size && draft.flavour);

  return (
    <main className="flex flex-1 flex-col gap-7 px-[var(--screen-pad)] pb-32 pt-2">
      <h1 className="text-2xl font-bold tracking-[-0.02em]">Tell me about it</h1>

      <Field label="Occasion">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => update({ occasion: c })}
              aria-pressed={draft.occasion === c}
              className={cn(
                "rounded-[var(--radius-pill)] transition-opacity",
                draft.occasion === c
                  ? "opacity-100 ring-1 ring-black/10"
                  : "opacity-55 hover:opacity-80",
              )}
            >
              <Chip variant={`category-${c}`}>{OCCASION_LABELS[c]}</Chip>
            </button>
          ))}
        </div>
      </Field>

      <Field label="Size">
        <div className="flex flex-col gap-2">
          {SIZES.map((s) => {
            const selected = draft.size === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => update({ size: s })}
                className={cn(
                  "flex items-center gap-3 rounded-[var(--radius-card)] border px-3 py-2.5 text-left text-sm transition-colors",
                  !selected && "border-hairline",
                )}
                style={
                  selected
                    ? {
                        background: "var(--violet-bg)",
                        color: "var(--violet-fg)",
                        borderColor: "var(--violet-border)",
                      }
                    : undefined
                }
              >
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                    selected ? "border-transparent" : "border-hairline",
                  )}
                  style={
                    selected ? { background: "var(--violet-solid)" } : undefined
                  }
                >
                  {selected && (
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </span>
                {s}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Flavour">
        <div className="flex flex-wrap gap-2">
          {FLAVOURS.map((f) => (
            <ChoiceChip
              key={f}
              selected={draft.flavour === f}
              onClick={() => update({ flavour: f })}
            >
              {f}
            </ChoiceChip>
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
          className="w-full rounded-[var(--radius-control)] border border-hairline bg-screen px-3 py-2.5 text-sm outline-none focus:border-black/30"
        />
      </Field>

      <Field label="Anything else" hint="Allergies, colors, inspiration…">
        <textarea
          rows={3}
          value={draft.notes ?? ""}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder="Pastel colors, no nuts, buttercream not fondant."
          className="w-full resize-none rounded-[var(--radius-control)] border border-hairline bg-screen px-3 py-2.5 text-sm outline-none focus:border-black/30"
        />
      </Field>

      <footer className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md border-t border-hairline bg-screen/95 px-[var(--screen-pad)] py-3 backdrop-blur">
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
    <section className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
          {label}
        </h2>
        {hint && <p className="text-[12px] text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
