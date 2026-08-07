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

### 1. Supabase project — done ✅

Project **`creamycreation`** (`uciouqrrxrljbhjfcxpq`, org `magarsa`, us-east-1) is
created, the migration is applied, and RLS is verified against the live DB (anon reads
the config seed row; anon insert returns 401). URL + publishable key are in `.env.local`.

Still to do by you, when Phase 1 lands: copy the **service role key** from the dashboard
(Settings → API) into your env — the MCP only exposes publishable keys.

```bash
# Local pgTAP run (optional, needs Docker):
supabase start && pnpm db:test
# Regenerate types from the live project (optional — hand-written types are accurate):
supabase gen types typescript --project-id uciouqrrxrljbhjfcxpq > lib/db/types.ts
```

### 2. Cloudflare (Workers via OpenNext) — adapter verified ✅

The Cloudflare deploy path is wired and **verified locally**: `@opennextjs/cloudflare`
1.20 builds the Next 16 app into a `workerd` bundle and the landing page renders under
the real Workers runtime (`GET / 200 OK`) — no Cloudflare account needed to confirm this.

> The Next.js 16 "version trap" you may read about affects `@cloudflare/next-on-pages`
> (Edge runtime, can't run Next 16's Node-only proxy). We use `@opennextjs/cloudflare`,
> which runs the **Node.js runtime** with `nodejs_compat` and supports Next 16.

Files: `open-next.config.ts`, `wrangler.jsonc`, and `initOpenNextCloudflareForDev()` in
`next.config.ts`. Scripts: `pnpm preview` (local workerd), `pnpm deploy` (to Cloudflare).

To go live (needs your Cloudflare account):

```bash
pnpm preview            # optional — run the worker bundle locally first
npx wrangler login
pnpm deploy             # builds + uploads the worker
```

Then set env vars per environment in the Cloudflare dashboard (or `wrangler secret put`
for secrets) — this is the test→baker switch point (PLAN.md §14). For ISR/data caching
later, add the R2 incremental cache override in `open-next.config.ts`.

### 3. CI secrets

The `db` CI job runs fully on GitHub-hosted runners (Docker included) with no secrets.
The `web` job needs no secrets for Phase 0 (the build has no required runtime env yet).

## Note on scope taken

- `availability_rules` from PLAN.md §3 was folded into `config` — the two tables had
  identical fields (DRY). Availability logic (Phase 3) reads from `config`.
- Next.js resolved to **16**, not 15 — `create-next-app` latest ships 16 now. React 19,
  Tailwind v4. Noted so the plan's "Next 15" reference isn't mistaken for a pin.
