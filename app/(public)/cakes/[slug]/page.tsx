import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/lib/ui/button";
import { CategoryBadge } from "@/lib/ui/category-badge";
import { Placeholder } from "@/lib/ui/placeholder";
import { getActiveCakes, getCakeBySlug } from "@/lib/db/queries";
import { bakeryIdentity } from "@/lib/bakery";

export const revalidate = 3600;

export async function generateStaticParams() {
  const cakes = await getActiveCakes();
  return cakes.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { name } = bakeryIdentity();
  const cake = await getCakeBySlug(slug);
  if (!cake) return { title: `Cake not found — ${name}` };
  return {
    title: `${cake.title} — ${name}`,
    description: cake.description ?? undefined,
  };
}

export default async function CakeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cake = await getCakeBySlug(slug);
  if (!cake) notFound();

  return (
    <main className="flex flex-1 flex-col pb-28">
      <div className="relative">
        <Placeholder aspect="4 / 3" label="photo" className="rounded-none" />
        <Link
          href="/cakes"
          aria-label="Back to the cakes"
          className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center border border-hairline bg-paper text-ink"
        >
          ←
        </Link>
      </div>

      <div className="flex flex-col gap-4 px-[var(--screen-pad)] pt-5">
        <CategoryBadge category={cake.category} className="self-start" />
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[24px] italic font-semibold">
            {cake.title}
          </h1>
          {cake.description && (
            <p className="text-[15px] leading-relaxed text-muted">
              {cake.description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {cake.size && (
            <span className="border border-hairline px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
              {cake.size}
            </span>
          )}
          {cake.flavour && (
            <span className="border border-hairline px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
              {cake.flavour}
            </span>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md border-t border-hairline bg-paper/95 px-[var(--screen-pad)] py-3 backdrop-blur">
        <Link href="/order/date" className="block">
          <Button className="w-full">Request something like this</Button>
        </Link>
      </div>
    </main>
  );
}
