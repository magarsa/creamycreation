# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions track the phases in [ROADMAP.md](ROADMAP.md).

## [Unreleased]

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
