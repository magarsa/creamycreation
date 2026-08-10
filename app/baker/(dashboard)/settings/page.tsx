import type { ReactNode } from "react";
import { requireBaker } from "@/lib/auth";
import { Button } from "@/lib/ui/button";
import { updateConfig, toggleIgMedia } from "./actions";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-[var(--radius-control)] border border-hairline bg-screen px-3 py-2.5 text-sm outline-none focus:border-black/30";

export default async function SettingsPage() {
  const { supabase } = await requireBaker();
  const [{ data: config }, { data: igMedia }] = await Promise.all([
    supabase.from("config").select("*").limit(1).single(),
    supabase
      .from("ig_media")
      .select("id, caption, thumbnail_url, media_url, permalink, is_hidden, posted_at")
      .order("posted_at", { ascending: false })
      .limit(25),
  ]);

  if (!config) {
    return (
      <main className="flex-1 px-[var(--screen-pad)] py-5 text-sm text-muted">
        No config row found.
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-[var(--screen-pad)] py-5">
      <h1 className="text-2xl font-bold tracking-[-0.02em]">Settings</h1>

      <form action={updateConfig} className="flex flex-col gap-5">
        <label className="flex items-start justify-between gap-3 rounded-[var(--radius-card)] border border-hairline px-4 py-3">
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Vacation mode</span>
            <span className="text-[13px] text-muted">
              Turns off date selection on the public site.
            </span>
          </span>
          <input
            type="checkbox"
            name="vacation_mode"
            defaultChecked={config.vacation_mode}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--wine-solid)]"
          />
        </label>

        <Field
          label="Away message"
          hint="Shown to customers while vacation mode is on."
        >
          <input
            name="vacation_message"
            defaultValue={config.vacation_message ?? ""}
            placeholder="Back on the 15th — DM to get on the list."
            className={inputClass}
          />
        </Field>

        <Field label="Max cakes per week">
          <input
            type="number"
            name="max_cakes_per_week"
            min={1}
            defaultValue={config.max_cakes_per_week}
            className={inputClass}
          />
        </Field>

        <Field label="Minimum notice (days)">
          <input
            type="number"
            name="min_notice_days"
            min={0}
            defaultValue={config.min_notice_days}
            className={inputClass}
          />
        </Field>

        <Field label="Pickup window">
          <input
            name="pickup_window"
            defaultValue={config.pickup_window}
            className={inputClass}
          />
        </Field>

        <Button type="submit" className="self-start">
          Save settings
        </Button>
      </form>

      <IgMediaSection igMedia={igMedia ?? []} />
    </main>
  );
}

type IgMediaRow = {
  id: string;
  caption: string | null;
  thumbnail_url: string | null;
  media_url: string;
  permalink: string;
  is_hidden: boolean;
  posted_at: string;
};

/** Recent Instagram posts, with a hide/unhide toggle for the public gallery.
 * Nothing to show until the account is connected and has synced at least
 * once (docs/instagram-setup.md) — that's a quiet empty state, not an error. */
function IgMediaSection({ igMedia }: { igMedia: IgMediaRow[] }) {
  return (
    <section className="flex flex-col gap-3 border-t border-hairline pt-6">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
          Instagram posts
        </h2>
        <p className="text-[12px] text-muted">
          Hide a post to pull it from the public gallery without touching
          Instagram.
        </p>
      </div>

      {igMedia.length === 0 ? (
        <p className="text-sm text-muted">
          Nothing synced yet. See docs/instagram-setup.md to connect an
          account.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2">
          {igMedia.map((m) => (
            <li key={m.id} className="relative">
              <a href={m.permalink} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element -- external Instagram CDN URL */}
                <img
                  src={m.thumbnail_url ?? m.media_url}
                  alt={m.caption ?? "Instagram post"}
                  className="aspect-square w-full rounded-[var(--radius-control)] object-cover"
                  style={m.is_hidden ? { opacity: 0.4 } : undefined}
                  loading="lazy"
                />
              </a>
              <form action={toggleIgMedia} className="absolute right-1 top-1">
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="hidden" value={String(m.is_hidden)} />
                <button
                  type="submit"
                  className="rounded-full bg-ink/80 px-2 py-0.5 text-[11px] font-medium text-white"
                >
                  {m.is_hidden ? "Show" : "Hide"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex flex-col gap-0.5">
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
          {label}
        </span>
        {hint && <span className="text-[12px] text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
