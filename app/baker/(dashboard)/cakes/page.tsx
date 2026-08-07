import { requireBaker } from "@/lib/auth";
import { CATEGORIES, OCCASION_LABELS } from "@/lib/domain/order";
import { Button } from "@/lib/ui/button";
import { CategoryBadge } from "@/lib/ui/category-badge";
import { cn } from "@/lib/ui/cn";
import { addCake, toggleCake } from "./actions";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-[var(--radius-control)] border border-hairline bg-screen px-3 py-2.5 text-sm outline-none focus:border-black/30";

export default async function CakesPage() {
  const { supabase } = await requireBaker();
  const { data } = await supabase
    .from("cakes")
    .select("*")
    .order("sort_order", { ascending: true });
  const cakes = data ?? [];

  return (
    <main className="flex flex-1 flex-col gap-6 px-[var(--screen-pad)] py-5">
      <h1 className="text-2xl font-bold tracking-[-0.02em]">Cakes</h1>

      <ul className="flex flex-col divide-y divide-hairline rounded-[var(--radius-card)] border border-hairline">
        {cakes.map((c) => (
          <li
            key={c.id}
            className={cn(
              "flex items-center justify-between gap-3 px-4 py-3",
              !c.is_active && "opacity-55",
            )}
          >
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-sm font-medium">{c.title}</span>
              <CategoryBadge category={c.category} className="self-start" />
            </div>
            <form action={toggleCake}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="active" value={String(c.is_active)} />
              <button
                type="submit"
                className="rounded-[var(--radius-control)] border border-hairline px-3 py-1.5 text-xs font-medium hover:bg-black/[0.03]"
              >
                {c.is_active ? "Hide" : "Show"}
              </button>
            </form>
          </li>
        ))}
        {cakes.length === 0 && (
          <li className="px-4 py-3 text-sm text-muted">No cakes yet.</li>
        )}
      </ul>

      <section className="flex flex-col gap-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
          Add a cake
        </h2>
        <form action={addCake} className="flex flex-col gap-3">
          <input name="title" required placeholder="Title" className={inputClass} />
          <select name="category" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Category…
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {OCCASION_LABELS[c]}
              </option>
            ))}
          </select>
          <input name="size" placeholder="Size (optional)" className={inputClass} />
          <input
            name="flavour"
            placeholder="Flavour (optional)"
            className={inputClass}
          />
          <textarea
            name="description"
            rows={2}
            placeholder="Description (optional)"
            className={cn(inputClass, "resize-none")}
          />
          <Button type="submit" className="self-start">
            Add cake
          </Button>
        </form>
      </section>
    </main>
  );
}
