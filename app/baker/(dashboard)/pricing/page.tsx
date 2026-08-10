import { requireBaker } from "@/lib/auth";
import { Button } from "@/lib/ui/button";
import { cn } from "@/lib/ui/cn";
import { formatPriceRange } from "@/lib/domain/pricing";
import {
  addAddon,
  addSize,
  deleteAddon,
  deleteSize,
  toggleAddon,
  toggleSize,
} from "./actions";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-[var(--radius-control)] border border-hairline bg-screen px-3 py-2.5 text-sm outline-none focus:border-black/30";

export default async function PricingPage() {
  const { supabase } = await requireBaker();
  const [{ data: sizes }, { data: addons }] = await Promise.all([
    supabase.from("sizes").select("*").order("sort_order", { ascending: true }),
    supabase.from("addons").select("*").order("sort_order", { ascending: true }),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-8 px-[var(--screen-pad)] py-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Pricing</h1>
        <p className="text-[13px] text-muted">
          Shown to customers as they order, and on the Flavours &amp; pricing page.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
          Sizes
        </h2>
        <ul className="flex flex-col divide-y divide-hairline rounded-[var(--radius-card)] border border-hairline">
          {(sizes ?? []).map((s) => (
            <li
              key={s.id}
              className={cn(
                "flex items-center justify-between gap-3 px-4 py-3",
                !s.is_active && "opacity-55",
              )}
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium">{s.label}</span>
                <span className="text-[13px] text-muted">
                  {formatPriceRange({
                    minCents: s.base_price_cents,
                    maxCents: s.base_price_cents,
                  })}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <form action={toggleSize}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="active" value={String(s.is_active)} />
                  <button
                    type="submit"
                    className="rounded-[var(--radius-control)] border border-hairline px-3 py-1.5 text-xs font-medium hover:bg-black/[0.03]"
                  >
                    {s.is_active ? "Hide" : "Show"}
                  </button>
                </form>
                <form action={deleteSize}>
                  <input type="hidden" name="id" value={s.id} />
                  <button
                    type="submit"
                    className="rounded-[var(--radius-control)] border border-hairline px-3 py-1.5 text-xs font-medium hover:bg-black/[0.03]"
                    style={{ color: "var(--coral-fg)" }}
                  >
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
          {(sizes ?? []).length === 0 && (
            <li className="px-4 py-3 text-sm text-muted">No sizes yet.</li>
          )}
        </ul>

        <form action={addSize} className="flex flex-col gap-3">
          <input name="label" required placeholder="Label" className={inputClass} />
          <input
            name="base_price"
            required
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="Base price ($)"
            className={inputClass}
          />
          <Button type="submit" className="self-start">
            Add size
          </Button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
          Add-ons
        </h2>
        <ul className="flex flex-col divide-y divide-hairline rounded-[var(--radius-card)] border border-hairline">
          {(addons ?? []).map((a) => (
            <li
              key={a.id}
              className={cn(
                "flex items-center justify-between gap-3 px-4 py-3",
                !a.is_active && "opacity-55",
              )}
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium">{a.label}</span>
                <span className="text-[13px] text-muted">
                  {formatPriceRange({
                    minCents: a.price_min_cents,
                    maxCents: a.price_max_cents,
                  })}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <form action={toggleAddon}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="active" value={String(a.is_active)} />
                  <button
                    type="submit"
                    className="rounded-[var(--radius-control)] border border-hairline px-3 py-1.5 text-xs font-medium hover:bg-black/[0.03]"
                  >
                    {a.is_active ? "Hide" : "Show"}
                  </button>
                </form>
                <form action={deleteAddon}>
                  <input type="hidden" name="id" value={a.id} />
                  <button
                    type="submit"
                    className="rounded-[var(--radius-control)] border border-hairline px-3 py-1.5 text-xs font-medium hover:bg-black/[0.03]"
                    style={{ color: "var(--coral-fg)" }}
                  >
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
          {(addons ?? []).length === 0 && (
            <li className="px-4 py-3 text-sm text-muted">No add-ons yet.</li>
          )}
        </ul>

        <form action={addAddon} className="flex flex-col gap-3">
          <input name="label" required placeholder="Label" className={inputClass} />
          <div className="flex gap-3">
            <input
              name="price_min"
              required
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="Min ($)"
              className={inputClass}
            />
            <input
              name="price_max"
              required
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="Max ($)"
              className={inputClass}
            />
          </div>
          <Button type="submit" className="self-start">
            Add add-on
          </Button>
        </form>
      </section>
    </main>
  );
}
