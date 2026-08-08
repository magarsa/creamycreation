import type { Metadata } from "next";
import { GalleryGrid } from "@/lib/ui/gallery-grid";
import { getActiveCakes } from "@/lib/db/queries";
import { bakeryIdentity } from "@/lib/bakery";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { name } = bakeryIdentity();
  return {
    title: `The cakes — ${name}`,
    description:
      "A gallery of custom cakes for birthdays, celebrations, and small weddings.",
  };
}

export default async function GalleryPage() {
  const cakes = await getActiveCakes();

  return (
    <main className="flex flex-1 flex-col gap-5 px-[var(--screen-pad)] pb-16 pt-2">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-[-0.02em]">The cakes</h1>
        <p className="text-[13px] text-muted">
          A few recent bakes. Yours is made to order.
        </p>
      </div>

      {cakes.length > 0 ? (
        <GalleryGrid cakes={cakes} />
      ) : (
        <p className="text-sm text-muted">New cakes coming soon.</p>
      )}
    </main>
  );
}
