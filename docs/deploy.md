# Deploy

Production runs on **Cloudflare Workers** via the OpenNext adapter. Deploys are
automated by `.github/workflows/deploy.yml` on every push to `main`.

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

## Manual deploy (fallback)

```bash
npx wrangler login
pnpm deploy          # opennextjs-cloudflare build && deploy
pnpm preview         # or run the worker locally first
```
