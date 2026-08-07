# Creamy Creation

Mobile-first ordering site for **Creamy Creation**, a one-person home bakery in Indian Land, SC making custom cakes for birthdays, celebrations, and small weddings.

Customers browse cakes, pick a date, describe what they want, and are handed off to Instagram DM to finish the conversation. There's no in-app payment or accounts — the app captures the inquiry, emails the baker, and gets out of the way. Orders need at least a week's notice; pickup only.

> **Status:** Pre-development. Planning complete, scaffolding next. See [ROADMAP.md](ROADMAP.md) for the build order.

## How it works

```
Customer                          App                         Baker
   │                               │                            │
   │  browse cakes / pick date     │                            │
   │──────────────────────────────▶                            │
   │  describe order (4 steps)     │                            │
   │──────────────────────────────▶  save inquiry              │
   │                               │──────── email ────────────▶│  (Resend)
   │  ◀── Instagram deep link ─────│                            │
   │                               │                            │
   │═══════ continue in IG DM ═════════════════════════════════▶│
```

The baker triages inquiries in an authenticated dashboard; confirmation and quoting happen over Instagram DM.

## Stack

- **Web:** Next.js 15 (App Router), TypeScript (strict), Tailwind, Instrument Sans (self-hosted)
- **Hosting:** Cloudflare Pages
- **Data / Auth / Storage:** Supabase (Postgres, Auth, Storage)
- **Email:** Resend
- **Background jobs:** one Cloudflare Worker (calendar ICS sync + Instagram feed sync, on cron)
- **Analytics:** Cloudflare Web Analytics

Full rationale and the alternatives we rejected are in [PLAN.md](PLAN.md).

## Repo layout

```
app/
  (public)/      Home, gallery, order flow, FAQ, weddings
  (baker)/       Auth-gated dashboard
  api/           Route handlers (submit-inquiry, health)
lib/
  domain/        Pure logic (availability, IG deep-link) — no framework deps
  db/            Supabase client + generated types
  ui/            Design-system primitives + tokens
  notifications/ Resend wrapper
workers/cron/    Cloudflare Worker (ICS + IG sync)
supabase/        Migrations, seed, pgTAP RLS tests
tests/           Vitest (unit) + Playwright (e2e)
docs/            Setup & operations guides (added per phase)
```

## Getting started

> Populated during Phase 0. Once scaffolded:

```bash
pnpm install
cp .env.example .env.local   # fill in Supabase / Resend / IG values
pnpm dev
```

Configuration is environment-driven so the same code runs against test values now and the baker's real values at launch — nothing bakery-specific is hardcoded. See [PLAN.md §14](PLAN.md) for the config strategy and [`.env.example`](.env.example) for every variable.

## Design system

Scoped to this app, not a generic kit. Off-white paper (`#EDECE8`), near-black ink (`#191918`), no pure black. Color carries meaning through a strict **3-state rule** — violet = *doing now*, coral = *needs attention*, amber = *done* — layered with a separate per-category badge palette. Colors are only ever applied through `<Chip>` / `<Button>` variants, never raw hex. Details in [PLAN.md §6](PLAN.md).

## Documentation

| Doc | What's in it |
|---|---|
| [ROADMAP.md](ROADMAP.md) | Phased build order, MVP definition, testable checkpoints |
| [PLAN.md](PLAN.md) | Architecture, data model, config strategy, licensing, risks |
| [CHANGELOG.md](CHANGELOG.md) | What shipped, per phase |
| `docs/` | Operational guides (calendar, Instagram, baker runbook, launch) — added as each phase lands |

## Licensing

**Code:** private / all rights reserved (client project) — no open-source license.
**Business:** the bakery operates under South Carolina cottage food rules, which require a made-in-a-home-kitchen disclosure and a food-safety certification. Go-live is gated on that certification. See [PLAN.md §15](PLAN.md).
