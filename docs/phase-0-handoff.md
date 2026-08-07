# Phase 0 — handoff & remaining connections

Phase 0 delivers a building, tested walking skeleton. The **code** side is done and
verified locally. The **cloud connections** below need your accounts, so they're
handoff steps — none block starting Phase 1 locally.

## What's done (verified locally)

- Next.js 16 (App Router) + TypeScript strict + Tailwind v4
- Instrument Sans self-hosted via `next/font`
- Design tokens + `Button` / `Chip` primitives (the only way to apply state/category color)
- `lib/config.ts` Zod env validation (fails loudly on missing/malformed vars)
- Supabase migration (`config` table + RLS) + seed + pgTAP RLS test
- Vitest unit/component tests (8 passing) · ESLint clean · `next build` green
- GitHub Actions CI (web job + db job)
- Landing placeholder visually verified on mobile viewport

## Remaining connections (need your accounts)

### 1. Supabase project

```bash
# Option A — link an existing/new cloud project:
supabase login
supabase link --project-ref <your-project-ref>
supabase db push          # applies supabase/migrations/0001_init.sql
supabase gen types typescript --linked > lib/db/types.ts   # replace hand-written types

# Option B — local dev (needs Docker Desktop running):
supabase start            # applies migrations + seed
pnpm db:test              # runs the pgTAP RLS tests
```

Then put the project URL + anon key into `.env.local` (and later into Cloudflare env vars).

### 2. Cloudflare Pages

The app builds with a standard `next build`. **One thing to verify before wiring the
deploy:** Cloudflare's Next.js adapter (`@opennextjs/cloudflare`) needs to support
Next.js **16** — it's brand new. Check current support before committing to it:

- **If supported:** add `@opennextjs/cloudflare` + a `wrangler.jsonc`, connect the repo
  in the Cloudflare dashboard, set the env vars per environment (this is the test→baker
  switch point, PLAN.md §14).
- **If not yet supported:** either pin Next.js 15 LTS (the plan's original target), or
  deploy to Vercel in the interim (works out of the box) and move to Cloudflare once the
  adapter catches up.

This is a real decision — flagged in the PR summary. It does not block Phase 1.

### 3. CI secrets

The `db` CI job runs fully on GitHub-hosted runners (Docker included) with no secrets.
The `web` job needs no secrets for Phase 0 (the build has no required runtime env yet).

## Note on scope taken

- `availability_rules` from PLAN.md §3 was folded into `config` — the two tables had
  identical fields (DRY). Availability logic (Phase 3) reads from `config`.
- Next.js resolved to **16**, not 15 — `create-next-app` latest ships 16 now. React 19,
  Tailwind v4. Noted so the plan's "Next 15" reference isn't mistaken for a pin.
