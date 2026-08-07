"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useOrder } from "@/lib/order/context";
import { MAX_REFERENCE_PHOTOS, STYLE_TAGS } from "@/lib/domain/order";
import { createClient } from "@/lib/db/client";
import { Button } from "@/lib/ui/button";
import { ChoiceChip } from "@/lib/ui/choice-chip";

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB guard

interface Photo {
  path: string;
  preview?: string;
}

export default function ReferencesPage() {
  const { draft, update } = useOrder();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  // Rebuild the tile list from the draft (previews are only for this session).
  const [photos, setPhotos] = useState<Photo[]>(() =>
    draft.photo_paths.map((path) => ({ path })),
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const full = photos.length >= MAX_REFERENCE_PHOTOS;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setError(null);
    setUploading(true);
    const next = [...photos];
    for (const file of files) {
      if (next.length >= MAX_REFERENCE_PHOTOS) break;
      if (!file.type.startsWith("image/") || file.size > MAX_FILE_BYTES) {
        setError("Images only, up to 15MB each.");
        continue;
      }
      try {
        const path = await uploadFile(draft.session_id, file);
        next.push({ path, preview: URL.createObjectURL(file) });
      } catch {
        setError("That upload didn't go through — try again.");
      }
    }
    setPhotos(next);
    update({ photo_paths: next.map((p) => p.path) });
    setUploading(false);
  }

  function remove(path: string) {
    const next = photos.filter((p) => p.path !== path);
    setPhotos(next);
    update({ photo_paths: next.map((p) => p.path) });
  }

  return (
    <main className="flex flex-1 flex-col gap-7 px-[var(--screen-pad)] pb-32 pt-2">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-[-0.02em]">
          Show me what you&rsquo;re picturing
        </h1>
        <p className="text-[13px] text-muted">All optional — whatever helps.</p>
      </div>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
          Reference photos
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <div
              key={p.path}
              className="relative aspect-square overflow-hidden rounded-[var(--radius-control)] bg-placeholder"
            >
              {p.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.preview}
                  alt="reference"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-[10px] uppercase tracking-wide text-muted">
                  photo
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(p.path)}
                aria-label="Remove photo"
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink/80 text-[11px] text-white"
              >
                ✕
              </button>
            </div>
          ))}
          {!full && (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="flex aspect-square items-center justify-center rounded-[var(--radius-control)] border border-dashed border-hairline text-xs text-muted hover:bg-black/[0.02] disabled:opacity-50"
            >
              {uploading ? "…" : "+ Add"}
            </button>
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={onPick}
        />
        {error && (
          <p className="text-[12px]" style={{ color: "var(--coral-fg)" }}>
            {error}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
          Or paste a link
        </h2>
        <input
          type="url"
          inputMode="url"
          value={draft.reference_link ?? ""}
          onChange={(e) => update({ reference_link: e.target.value })}
          placeholder="Pinterest or Instagram URL"
          className="w-full rounded-[var(--radius-control)] border border-hairline bg-screen px-3 py-2.5 text-sm outline-none focus:border-black/30"
        />
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
          Style, in a word
        </h2>
        <div className="flex flex-wrap gap-2">
          {STYLE_TAGS.map((t) => (
            <ChoiceChip
              key={t}
              selected={draft.style_tag === t}
              onClick={() =>
                update({ style_tag: draft.style_tag === t ? undefined : t })
              }
            >
              {t}
            </ChoiceChip>
          ))}
        </div>
      </section>

      <footer className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md border-t border-hairline bg-screen/95 px-[var(--screen-pad)] py-3 backdrop-blur">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[13px] text-muted">
            {photos.length} {photos.length === 1 ? "photo" : "photos"} added
          </span>
        </div>
        <Button
          className="w-full"
          disabled={uploading}
          onClick={() => router.push("/order/review")}
        >
          Review
        </Button>
      </footer>
    </main>
  );
}

async function uploadFile(sessionId: string, file: File): Promise<string> {
  const res = await fetch("/api/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, filename: file.name }),
  });
  if (!res.ok) throw new Error("upload-url failed");
  const { path, token } = (await res.json()) as { path: string; token: string };

  const supabase = createClient();
  const { error } = await supabase.storage
    .from("inquiry-photos")
    .uploadToSignedUrl(path, token, file);
  if (error) throw error;
  return path;
}
