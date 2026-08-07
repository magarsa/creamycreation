import { Button } from "@/lib/ui/button";
import { Chip } from "@/lib/ui/chip";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center gap-10 px-[var(--screen-pad)] py-16">
      <header className="flex flex-col gap-3">
        <Chip variant="amber" className="self-start">
          Phase 0 · walking skeleton
        </Chip>
        <h1 className="text-4xl font-bold leading-[1.05] tracking-[-0.03em]">
          Simple, elegant cakes.
          <br />
          Made one at a time.
        </h1>
        <p className="text-[15px] leading-relaxed text-muted">
          Custom cakes for birthdays, celebrations, and small weddings. Home
          bakery in Indian Land, SC. Pickup only, one week&rsquo;s notice.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <Button>Check availability</Button>
        <Button variant="secondary">See the cakes</Button>
      </div>

      <section className="flex flex-col gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
          Design system check
        </p>
        <div className="flex flex-wrap gap-2">
          <Chip variant="violet">Selected</Chip>
          <Chip variant="coral">1 slot left</Chip>
          <Chip variant="amber">Confirmed</Chip>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip variant="category-birthday">Birthday</Chip>
          <Chip variant="category-kids">Kids</Chip>
          <Chip variant="category-anniversary">Anniversary</Chip>
          <Chip variant="category-wedding">Wedding</Chip>
          <Chip variant="category-cupcakes">Cupcakes</Chip>
          <Chip variant="category-just_because">Just because</Chip>
        </div>
      </section>

      <footer className="mt-auto text-[13px] text-muted">
        Not yet taking orders — this is a preview build.
      </footer>
    </main>
  );
}
