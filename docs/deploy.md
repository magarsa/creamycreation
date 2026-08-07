# Deploy

Production runs on **Cloudflare Workers** via the OpenNext adapter.

> ## ⚠️ Deploy via CI, not locally — secrets get baked in
> OpenNext snapshots the whole **build-time environment** into the Worker bundle
> (`.open-next/cloudflare/next-env.mjs`). So `pnpm run deploy` **run locally** bakes
> everything in your `.env.local` — including `SUPABASE_SERVICE_ROLE_KEY` — into the
> deployed code, in plaintext. That is not where a secret should live.
>
> **The safe path:** deploy from CI (`.github/workflows/deploy.yml`), where the build
> environment has only the public `NEXT_PUBLIC_*` values (fine to bake) and the real
> secrets are **Cloudflare Worker secret bindings** injected at runtime. Use a local
> `pnpm run deploy` only for throwaway/dev, never with real secrets in `.env.local`.

## Secret hardening checklist (before real customers)

1. **Rotate the service-role key** — Supabase → Settings → API → roll `service_role`
   (any local deploy so far has baked the old one into a bundle). Update `.env.local`
   and the Worker secret with the new value.
2. **Set Worker secret bindings** (you run these; the value is pasted, never committed):
   ```bash
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   npx wrangler secret put RESEND_API_KEY
   npx wrangler secret put BAKERY_PRIMARY_EMAIL   # personal email — not committed to the public repo
   npx wrangler secret put RESEND_FROM
   ```
   `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` are public and inlined at build — no binding needed.
3. **Wire CI deploy** (below) and deploy from Actions, so the bundle is built clean.
4. Confirm the bundle is clean: `grep -rc SUPABASE_SERVICE_ROLE .open-next/` should not
   show the key *value* embedded (only runtime `process.env` lookups).

## One-time setup (needs your Cloudflare account)

### 1. Create a Cloudflare API token

Cloudflare dashboard → **My Profile → API Tokens → Create Token**:

- Use the **"Edit Cloudflare Workers"** template (or a custom token with
  `Account → Workers Scripts → Edit` on your account), then create it.
- Copy the token value (shown once).

### 2. Find your Account ID

Cloudflare dashboard → **Workers & Pages** → the Account ID is in the right sidebar.

### 3. Add them to GitHub

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | the token from step 1 (secret) |
| `CLOUDFLARE_ACCOUNT_ID` | the id from step 2 (secret) |

That's all Phase 0 needs — the landing page is static. Push to `main` (merge the
Phase 0 PR) and the deploy workflow ships it to a `*.workers.dev` URL.

## Added as the app grows

**Build-time public vars** (add as GitHub Actions *variables*, not secrets, once the
browser talks to Supabase — Phase 1):

- `NEXT_PUBLIC_SUPABASE_URL` = `https://uciouqrrxrljbhjfcxpq.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the publishable key (browser-safe)
- `NEXT_PUBLIC_SITE_URL` = the production URL

**Runtime server vars/secrets** on the Worker (Cloudflare dashboard → your Worker →
Settings → Variables, or `wrangler secret put`) — this is the test→baker switch point
(PLAN.md §14):

- `BAKERY_*` identity (non-secret — can be plain vars)
- `SUPABASE_SERVICE_ROLE_KEY` (secret — Phase 1)
- `RESEND_API_KEY`, `RESEND_FROM` (Phase 1)
- `BAKERY_ICS_URL` (Phase 3), `IG_LONG_LIVED_TOKEN`, `BAKERY_IG_USER_ID` (Phase 4)

## Manual deploy (dev only — see the warning above)

```bash
npx wrangler login
pnpm run deploy      # opennextjs-cloudflare build && deploy
                     # (use `pnpm run deploy`, not `pnpm deploy` — the latter is a
                     #  reserved pnpm built-in and won't run this script)
pnpm run preview     # or run the worker locally first
```

This bakes `.env.local` into the bundle. Fine for a personal dev deploy; **never** for
a build that will serve real customers — use the CI deploy instead.

Live URL: https://creamycreation.safalranamagar.workers.dev
