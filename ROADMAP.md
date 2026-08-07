# Creamy Creation — Implementation Roadmap

Phased, MVP-first delivery. Each phase is independently shippable and ends at a **testable checkpoint** — a concrete thing you can verify before moving on. Architecture and rationale live in [PLAN.md](PLAN.md); this file is the *build order*.

## Guiding principles

- **MVP = Phase 0 + Phase 1.** A customer can submit an inquiry and the baker gets emailed. Everything after that is iterative improvement on a working product.
- **Every phase ships to a live preview URL.** No phase is "done" until it's deployed and its checkpoint is verified against the deployed build, not just localhost.
- **Tests are written with the feature, not after.** Each phase lists the tests that must be green to close it.
- **Docs are part of Definition of Done.** No phase closes with stale docs. See [Documentation strategy](#documentation-strategy).
- **Stub, don't skip.** Where a later phase owns a capability (real availability, IG feed), the MVP ships a deliberate stub (all dates open, curated-only gallery) so the funnel is whole from day one.

## Definition of Done (applies to every phase)

A phase is closed only when **all** of these are true:

1. Code merged to `main` via PR.
2. All tests listed for the phase are green in CI.
3. Deployed to the Cloudflare preview/prod URL and the **checkpoint** below is verified against the deployed build.
4. Docs updated (README, CHANGELOG, and any phase-specific guide).
5. `CHANGELOG.md` has an entry for the phase under a version tag.

## Phase sequence

```
        ┌─────────────────────────── MVP ───────────────────────────┐
        │                                                            │
  ┌───────────┐   ┌───────────────────┐                             │
  │  Phase 0  │──▶│      Phase 1       │  ◀── shippable product ─────┘
  │ Skeleton  │   │  Core funnel       │
  │ + deploy  │   │  (email + IG link) │
  └───────────┘   └─────────┬─────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
  ┌───────────┐      ┌───────────┐       ┌───────────┐
  │  Phase 2  │      │  Phase 3  │       │  Phase 4  │
  │  Baker    │      │ Calendar  │       │ IG feed   │
  │ dashboard │      │ + avail.  │       │  sync     │
  └─────┬─────┘      └─────┬─────┘       └─────┬─────┘
        └───────────────────┼───────────────────┘
                            ▼
                    ┌───────────────┐
                    │   Phase 5     │
                    │ Weddings +    │
                    │ polish +      │
                    │ launch prep   │
                    └───────┬───────┘
                            ▼
                    ┌───────────────┐
                    │  Phase 6 (v1.5)│
                    │  IG DM webhook │  ◀── post-launch
                    └───────────────┘
```

Phases 2, 3, and 4 depend only on Phase 1 — they can be built in any order, or in parallel git worktrees, because they touch mostly separate surfaces (dashboard vs. worker/availability vs. worker/IG). Phase 5 depends on 2–4 being done.

---

## Phase 0 — Walking skeleton & foundations

**Goal:** Prove the entire pipeline (code → CI → deploy → DB) works with one trivial styled page, before building any feature. De-risks tooling so no feature phase gets derailed by infra surprises.

**Ships:**
- Next.js 15 (App Router) + TypeScript strict + Tailwind
- Instrument Sans self-hosted via `next/font`
- Design tokens in `lib/ui/tokens.css` (ink, paper, 3 state colors, 5 category colors) + `Button`/`Chip` primitives
- Supabase project + first migration (`config`, `availability_rules` seed rows) + typed client in `lib/db/`
- `lib/config.ts` — Zod-validated env loader (fails the build on missing/malformed vars)
- `.env.example` documenting every variable (see [PLAN.md §14](PLAN.md))
- CI (GitHub Actions): typecheck + lint + Vitest + pgTAP runner wired, even with few tests
- Cloudflare Pages: deploy from `main`, preview deploys on PRs

**Checkpoint (verify against deployed build):**
- The `*.pages.dev` URL renders a styled "Creamy Creation" placeholder in Instrument Sans with the correct paper/ink colors.
- Opening a PR triggers a green CI run + a preview deploy.
- Removing a required env var makes the build fail loudly (add a test asserting `lib/config.ts` throws).

**Tests:** `lib/config.ts` validation (missing var → throw); one smoke Vitest; one pgTAP asserting RLS is enabled on `config`.

**Docs:** README quickstart (clone → install → env → dev → deploy); `.env.example` fully commented; link README → PLAN.md for architecture.

---

## Phase 1 — MVP: the core funnel

**Goal:** The money path. A real customer goes landing → gallery → 4-step order → submit → Instagram handoff, and the baker gets an email. **No dashboard, no ICS, no IG feed yet** — the baker reads email and (if needed) Supabase Studio.

**Ships:**
- Home, Gallery (curated `cakes` only, seeded by hand), Cake detail
- 4-step order flow:
  - Step 1 date picker — **stub availability**: every date beyond `min_notice_days` shows open (real calendar arrives in Phase 3)
  - Step 2 details (occasion / size / flavour / message / notes) with validation gating
  - Step 3 reference photos (client-side resize → signed-URL upload to `pending/`)
  - Step 4 review
- `/api/submit-inquiry` Route Handler: Zod validate → insert `inquiries` → move photos `pending/`→`bound/` → Resend email → `notification_status` tracking → idempotency key
- Cloudflare rate-limit rule (5/IP/hour)
- `/order/sent`: IG deep link `ig.me/m/{handle}?text=…&ref=inquiry_{id}` + desktop / no-IG fallback (copy-to-clipboard + `mailto:`)
- Flavours + FAQ pages (MDX; cottage-food disclosure as placeholder pending cert)

**Explicitly deferred:** real availability → Phase 3 · dashboard → Phase 2 · IG feed → Phase 4.

**Checkpoint (this is the MVP ship — verify against deployed build):**
- Playwright E2E on 390×844: full funnel completes, an `inquiries` row is created, `/order/sent` deep link contains `?ref=inquiry_{id}`.
- A real submission lands a Resend email in the (test) baker inbox.
- Forcing a Resend failure still saves the inquiry with `notification_status='failed'`.
- Hitting the endpoint 6× from one IP returns `429` on the 6th.

**Tests:**
- Vitest: `submit-inquiry` (valid → 200 + row + email; duplicate idempotency key → original; invalid → 422; Resend fail → saved+flagged; >6 photos → 422); availability stub returns open for in-range dates.
- Playwright: funnel happy path + validation-blocks-Next + deep-link contains ref + desktop fallback visible.
- pgTAP: anon cannot SELECT `inquiries`/`inquiry_photos`; anon cannot INSERT directly.

**Docs:** README — add "the funnel" section + how to seed cakes; document the order-draft data contract; CHANGELOG `v0.1.0`.

---

## Phase 2 — Baker dashboard

**Goal:** Baker stops touching Supabase Studio. Log in, triage inquiries, manage the gallery.

**Ships:**
- Magic-link auth (primary + backup email from config, both receive links)
- `/baker/orders` — list + weekly capacity meter
- `/baker/orders/[id]` — detail, status transitions (plain enum, app-layer), internal notes
- `/baker/notifications` — failed-Resend queue
- `/baker/cakes` — CRUD for curated gallery
- `/baker/settings` — edit `config` row (capacity, min-notice, vacation mode + message)

**Checkpoint:**
- Baker logs in via magic link, opens the inquiry submitted in Phase 1, moves it `submitted → needs_quote → confirmed`, adds an internal note — all persisted.
- Toggling vacation mode disables date selection on the public funnel with the configured message.

**Tests:** pgTAP (authenticated baker can SELECT/UPDATE inquiries; anon cannot; baker cannot read Storage outside `bound/`); Vitest for status-transition logic; Playwright for login → triage flow.

**Docs:** baker runbook (`docs/baker-runbook.md`) — how to log in, what each status means, how to handle a failed notification; CHANGELOG `v0.2.0`.

---

## Phase 3 — Calendar & real availability

**Goal:** Availability driven by the baker's real calendar via published ICS, replacing the Phase 1 stub.

**Ships:**
- Cloudflare Worker (cron project) — ICS sync trigger (hourly) → upsert `blocked_dates`
- `lib/domain/availability.ts` switches from "all open" to `blocked_dates` + `min_notice_days`
- `/baker/calendar` — read-only blocked-dates view
- Fail-open on ICS fetch failure (retain cache) + email alert after 3 consecutive failures

**Checkpoint:**
- Add an all-day event to the test "Bookings" calendar → within the sync window that date disappears from the public picker.
- Break the ICS URL → the picker still works off cached `blocked_dates`; after 3 failed syncs the baker gets an alert email.

**Tests:** Vitest for `availability.ts` (blocked → unavailable; within min-notice → unavailable; open → open; **timezone edge** submission 11:55pm local vs UTC); worker ICS-parse unit test.

**Docs:** `docs/calendar-setup.md` — how to publish a private ICS URL (Google/Apple), how sync + fail-open work, cron cadence; CHANGELOG `v0.3.0`.

---

## Phase 4 — Instagram feed sync

**Goal:** Gallery auto-populates from Instagram so the baker posts once, not twice.

**Ships:**
- Second cron trigger on the same worker — IG Graph API `/media` (latest 25) → upsert `ig_media`
- Gallery merges curated `cakes` + `ig_media` through the same photo-grid primitive
- `/baker/settings` — hide/unhide IG media
- Long-lived token as a Cloudflare secret; ~50-day manual refresh (calendar reminder, no refresh worker)

**Checkpoint:**
- New post on the test IG Business account appears in the public gallery within the sync window.
- Hiding an item in settings removes it from the public gallery.

**Tests:** Vitest for the media-merge/dedup logic; worker sync test with a mocked Graph API response.

**Docs:** `docs/instagram-setup.md` — Business account + Facebook Page link, token generation, the 50-day refresh procedure; CHANGELOG `v0.4.0`.

---

## Phase 5 — Weddings, polish & launch prep

**Goal:** Feature-complete v1 + launch readiness.

**Ships:**
- Weddings landing + inquiry form (reuses `/api/submit-inquiry`, `occasion='wedding'`, guest-count segments, teal state)
- Cottage-food disclosure finalized (**gated on cert scope — see PLAN.md §15**)
- PWA manifest + install prompt
- Cloudflare Web Analytics + funnel events
- Full a11y audit; contrast-floor lint (opacity ≥ 0.55) enforced in CI
- Launch checklist + cutover runbook

**Checkpoint:**
- Wedding inquiry flows end to end and appears in the dashboard with the wedding category.
- Lighthouse + a11y pass on mobile.
- Launch checklist complete **except external gates**: food-safety cert, domain purchase, baker's real config values.

**Tests:** Playwright for the wedding funnel; a11y assertions (axe) in the E2E run; CI contrast lint.

**Docs:** `docs/launch-checklist.md` + `docs/cutover.md` (the §14 env-swap procedure, gated on cert + domain); CHANGELOG `v1.0.0`.

---

## Phase 6 — Instagram DM integration (v1.5, post-launch)

**Goal:** Close the loop — DMs land in the dashboard, auto-linked to the inquiry.

**Ships:**
- Meta app review for Messaging permissions (**start on the day Phase 5 ships** — it runs 2–6 weeks in parallel)
- Migration: add `ig_thread_id` on inquiries; add `order_events` table if a timeline view is wanted
- DM webhook handler; `ref=inquiry_{id}` from the ig.me link stitches the thread to the inquiry
- Baker DM view inside `/baker/orders/[id]`

**Checkpoint:** a DM sent via an `/order/sent` link shows up on the matching inquiry's detail page; baker can reply within the 24-hour window.

**Docs:** `docs/instagram-dm.md` — webhook config, app-review notes, the 24-hour window rule; CHANGELOG `v1.1.0`.

---

## Documentation strategy

Docs live in-repo and are updated as part of each phase's Definition of Done — not batched at the end.

| Doc | Purpose | Owner phase |
|---|---|---|
| `README.md` | High-level: what it is, stack, quickstart, doc map | Phase 0, kept current |
| `PLAN.md` | Architecture & design source of truth (the "why") | Living |
| `ROADMAP.md` | This file — build order & checkpoints | Living |
| `CHANGELOG.md` | What shipped per phase/version ([Keep a Changelog](https://keepachangelog.com)) | Every phase |
| `.env.example` | Every config var, commented | Phase 0, kept current |
| `docs/baker-runbook.md` | How the baker operates the dashboard | Phase 2 |
| `docs/calendar-setup.md` | ICS publishing + sync | Phase 3 |
| `docs/instagram-setup.md` | IG feed sync setup + token refresh | Phase 4 |
| `docs/launch-checklist.md` + `docs/cutover.md` | Go-live steps + env swap | Phase 5 |
| `docs/instagram-dm.md` | DM webhook + app review | Phase 6 |

Inline ASCII diagrams (per PLAN.md eng-review prefs) go in: `availability.ts` (decision tree), the submit-inquiry handler (request flow), and the cron worker (sync pipeline).

## Estimating (CC-assisted, rough)

| Phase | Scope | Est. |
|---|---|---|
| 0 | Skeleton + deploy | ~1 day |
| 1 | Core funnel (MVP) | ~5–7 days |
| 2 | Dashboard | ~3–4 days |
| 3 | Calendar/availability | ~2 days |
| 4 | IG feed | ~1–2 days |
| 5 | Weddings + polish | ~2 days |
| 6 | IG DM (v1.5) | post-launch, gated on Meta review |

MVP (Phase 0+1) is the first real milestone. Ship it, get it in front of the baker, then iterate 2→5.
