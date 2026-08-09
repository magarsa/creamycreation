# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions track the phases in [ROADMAP.md](ROADMAP.md).

## [Unreleased]

### Added — Required contact email on inquiries
- The order form now requires an email alongside the (still optional) Instagram handle. The Instagram DM handoff only reaches the baker if the customer actually taps through and sends it — Instagram's messaging rules don't let a business message someone who hasn't messaged first, so a typo'd or skipped handle isn't recoverable. Email is the platform-independent fallback that always works.
- **Schema** (migration 0006): `inquiries.email`, nullable — existing pre-migration rows have none on file and backfilling them would be fake data. "Required" is enforced at the application layer (the Zod schema) for every new submission.
- Shown on the baker's inquiry detail page as a `mailto:` link, and included in the new-inquiry notification email.
- **Tests**: 5 new (schema validation, handler rejection on missing/malformed email, notification content).

### Added — Phase 4 (Instagram feed sync)
- **Second cron trigger** on the existing worker (`workers/cron`), hourly at :40 (offset from the calendar sync's :20 so a slow run of one never delays the other): fetches the latest 25 posts from the Instagram Graph API and rebuilds `ig_media`. Upserts before pruning, same fail-open shape as the calendar sync.
- **Schema** (migration 0005): `ig_media` (publicly readable, filtered to `is_hidden = false` for anon; the baker's session sees everything). The baker's write access is a **column grant, not just a row policy** — `is_hidden` is togglable from `/baker/settings`, but the sync's own content (caption, media_url, permalink, ...) isn't baker-editable, the same column-grant pattern 0004 used for `blocked_dates.reason`. `sync_state` gains a second job row (`instagram`) — reused, not re-created, per PLAN.md §3.
- **Domain** (pure, tested): `ig-media.ts` — Graph API response parsing (tolerant of the API's actual non-colon UTC offset, which zod's strict ISO-datetime validator rejects), the add/stale diff a sync run needs, and the gallery merge (curated `cakes` first in their existing order, then IG posts newest-first — source-ordered rather than date-interleaved, since a cake's upload time isn't comparable to a post's timestamp).
- **Gallery**: `/cakes` now merges both sources through one grid. IG tiles render the actual synced photo — the first real photography the gallery shows, cakes still being grey placeholders pending real product photos. IG posts have no category, so they only ever appear under "All".
- **`/baker/settings`**: Instagram posts section with a Hide/Show toggle per post — pulls something from the public gallery without touching Instagram itself.
- **Tests**: 18 new unit tests (Graph API parsing incl. the timestamp-format edge case, the sync diff, the gallery merge); pgTAP for `ig_media`'s RLS (88 total).
- **Docs**: [docs/instagram-setup.md](docs/instagram-setup.md) — Business/Creator account setup, long-lived token generation, the ~50-day refresh cadence (tokens last 60), and what happens when a sync fails.
- _Not included_: DM webhook / thread linking (v1.5, gated on Meta app review per PLAN.md §5).

### Added — Phase 3 (calendar & real availability)
- **Cron worker** (`workers/cron`, a separate Wrangler project from the OpenNext-built app): hourly ICS sync that fetches the baker's published calendar, parses it, and rebuilds `blocked_dates`. Upserts before pruning, so a half-finished run over-blocks rather than opening a taken date.
- **Schema** (migration 0004): `blocked_dates` (anon-readable cache, service-role writes) and `sync_state` (baker-readable job health). Anon's read on `blocked_dates` is a **column grant, not just a row policy** — the picker needs the date, but `reason` holds calendar event titles ("Chen order") that must not be readable with the publicly-shipped anon key. `sync_state` replaces PLAN.md §5's `sync_failures` log — one row per job answers "healthy?" and "how many in a row?" without a windowed query or unbounded growth.
- **Domain** (pure, tested): `ics.ts` — RFC 5545 line unfolding, all-day vs. timed events, exclusive all-day `DTEND`, `TZID`/UTC day resolution, cancelled-event and runaway-`DTEND` handling; `sync.ts` — the fail-open policy (keep the cache on failure; one alert per outage at 3 consecutive failures, reset on recovery).
- **Real availability**: the date picker's Phase 1 stub is gone — blocked dates now come from the ICS cache. A saved draft whose date has since been taken is caught on return instead of failing at submit.
- **Server-side date check**: `submit-inquiry` re-validates the date against blocked dates, min-notice, and vacation mode, so a stale draft or a hand-rolled POST can't book a day the picker greys out.
- **`/baker/calendar`**: read-only blocked dates by month, plus sync health with an explicit warning that a stale feed means recent bookings aren't blocked on the site yet.
- **Tests**: 43 new unit tests (ICS parsing, sync policy, availability edges incl. the bakery-midnight case, submit-inquiry date rejection); pgTAP for the two new tables.
- **Docs**: [docs/calendar-setup.md](docs/calendar-setup.md) — publishing a private ICS URL, worker secrets, how events map to blocked days, and what happens when the feed breaks.
- _Not included_: a "one slot left" state (needs capacity math from inquiry status — deferred with the rest to v1.5) and manual blocking from the dashboard (the calendar is the source of truth).

### Added — Phase 1 (core funnel, in progress)
- **Schema**: `cakes`, `inquiries`, `inquiry_photos` + enums, RLS, storage buckets (migration 0002, applied to live DB). Inquiries are insert-only via the service role (no anon policy). 6 curated cakes seeded; db types regenerated.
- **Domain** (pure, tested): order Zod schema + option lists, availability stub (date-key based, timezone-aware), Instagram deep-link builder.
- **Read-side**: home, gallery (masonry + category filters), cake detail (SSG from live DB).
- **Order funnel**: 4-step flow (date · details · references · review) with a sessionStorage-persisted draft, then `/order/sent` with the Instagram "Open the DM" handoff.
- **API**: `submit-inquiry` (validate → service-role insert → move photos → Resend email, non-fatal → `notification_status`; idempotent on key) and `upload-url` (signed upload URLs). Verified end-to-end against the live project.
- **Pages**: flavours & pricing, FAQ (with cottage-food disclosure placeholder).
- **Tests**: 27 unit tests; pgTAP RLS coverage extended to the new tables.
- _Remaining for Phase 1_: Playwright funnel E2E, submit-handler unit tests, then merge.

### Added
- **Phase 0 — walking skeleton & foundations:**
  - Next.js 16 (App Router) + TypeScript strict + Tailwind v4; Instrument Sans self-hosted via `next/font`.
  - Design tokens (`app/globals.css`) + `Button` / `Chip` primitives — the only sanctioned way to apply state/category color (PLAN.md §6).
  - `lib/config.ts` — Zod-validated env loader that fails loudly on missing/malformed vars; `.env.example` documents every variable.
  - Supabase migration (`config` table + RLS policies), seed, and pgTAP RLS tests. `availability_rules` folded into `config` (was redundant).
  - Supabase browser/server clients (`lib/db/`).
  - Vitest unit + component tests (config validation, UI primitives); ESLint; `next build`.
  - GitHub Actions CI: `web` (typecheck · lint · test · build) + `db` (migrations · pgTAP).
  - Styled landing placeholder, visually verified on mobile.
  - CI/CD: `.github/workflows/deploy.yml` auto-deploys to Cloudflare Workers on push to `main` (see [docs/deploy.md](docs/deploy.md)).
- Planning docs: [PLAN.md](PLAN.md), [ROADMAP.md](ROADMAP.md), README, and this changelog.
- [docs/phase-0-handoff.md](docs/phase-0-handoff.md) and [docs/deploy.md](docs/deploy.md) — connection & deploy steps.

### Infrastructure
- Provisioned Supabase project `creamycreation` (`uciouqrrxrljbhjfcxpq`, us-east-1); migration applied; RLS verified against the live DB.

### Notes
- Resolved to Next.js **16** (not 15) — `create-next-app` latest ships 16. React 19, Tailwind v4.
- Cloudflare deploy wired via `@opennextjs/cloudflare` (Workers, Node runtime) and **verified locally** — Next 16 builds to a `workerd` bundle and renders under the Workers runtime. `pnpm preview` runs it locally; `pnpm deploy` ships it. (The Next 16 "version trap" affects `next-on-pages`/Edge, not this adapter.)

<!--
Version ↔ phase map (fill in as phases land):
  v0.1.0 — Phase 1  Core funnel (MVP)
  v0.2.0 — Phase 2  Baker dashboard
  v0.3.0 — Phase 3  Calendar & availability
  v0.4.0 — Phase 4  Instagram feed sync
  v1.0.0 — Phase 5  Weddings + polish + launch
  v1.1.0 — Phase 6  Instagram DM (v1.5)
Phase 0 (skeleton) ships under Unreleased until the first feature tag.
-->
