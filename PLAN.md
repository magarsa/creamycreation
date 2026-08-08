# Creamy Creation — Implementation Plan

**Version**: v1 (post-eng-review)
**Owner**: Safal
**Status**: Ready to scaffold pending answers to Open Questions

---

## 1. Product framing

Mobile-first lead-capture funnel for a one-person home bakery in Indian Land, SC. Customers browse cakes, pick a date, describe an order, hand off to Instagram DM. Baker triages inquiries in an authenticated dashboard.

**Explicitly NOT in scope for v1** (see full list in §11):
in-app payments, customer accounts, in-app messaging, delivery, multi-tenant, push notifications, custom analytics dashboard.

**Locked decisions:**
- Framing: **Lead funnel + baker CRM**
- Calendar: **published private ICS URL** (no OAuth, no token-refresh cron)
- Baker dashboard: **v1 scope**
- Tenancy: **Single tenant** (bakery config lives in a `config` table, not hardcoded)
- IG integration: **feed sync in v1**, DM webhook in v1.5
- Tests: **Vitest + Playwright + pgTAP** from day one

---

## 2. Architecture

### Stack
- **Web**: Next.js 15 (App Router), TypeScript, Tailwind, Instrument Sans via `next/font` (self-hosted)
- **Hosting**: Cloudflare Pages
- **Data/Auth/Storage**: Supabase (Postgres, Auth, Storage)
- **Notifications**: Resend (baker email)
- **Workers**: One Cloudflare Worker with two cron triggers (calendar ICS sync, IG feed sync)
- **Analytics**: Cloudflare Web Analytics (free, no cookie banner)

### Repo layout — single Next.js app, no monorepo

```
creamy-creation/
├── app/
│   ├── (public)/          # Home, gallery, order flow, FAQ, weddings
│   ├── (baker)/           # Auth-gated dashboard
│   └── api/
│       ├── submit-inquiry/route.ts
│       └── health/route.ts
├── lib/
│   ├── domain/            # Pure fns: availability calc, IG deep-link builder
│   ├── db/                # Supabase client, generated types
│   ├── ui/                # Chip, Button, Calendar, PhotoGrid, StateColor tokens
│   └── notifications/     # Resend wrapper with notification_status tracking
├── workers/
│   └── cron/              # One Wrangler project, two scheduled triggers
├── supabase/
│   ├── migrations/
│   ├── seed.sql
│   └── tests/             # pgTAP tests for RLS policies
├── tests/
│   ├── unit/              # Vitest
│   └── e2e/               # Playwright
└── PLAN.md
```

---

## 3. Data model

All tables: `id uuid pk`, `created_at timestamptz default now()`. RLS on from day one.

### `config` (single row — baker-tunable operational values only)
`max_cakes_per_week int`, `min_notice_days int`, `pickup_window text`, `vacation_mode bool`, `vacation_message text nullable`. **Bakery identity (name, IG handle, timezone, emails, ICS URL) lives in Cloudflare Pages environment variables, not here** — see §14 Config strategy.

### `cakes` (curated gallery)
`title`, `slug unique`, `description`, `category` (enum: birthday | kids | anniversary | wedding | cupcakes | just_because), `size`, `flavour`, `sort_order`, `is_active`. Photos in Supabase Storage.

### `ig_media` (v1, auto-synced from Instagram)
`ig_media_id unique`, `caption`, `media_url`, `permalink`, `thumbnail_url`, `media_type`, `posted_at`, `synced_at`, `is_hidden bool`.

### `availability_rules` (single row)
`max_cakes_per_week int`, `min_notice_days int` (default 7), `pickup_window text`.

### `blocked_dates` (materialized from ICS)
`blocked_date unique`, `source` ('ics' | 'manual'), `reason text nullable`, `synced_at`. Cache table — safe to truncate & rebuild. (Shipped as `blocked_date`, not `date`, for the same reason `inquiries` uses `event_date`.)

### `sync_state` (one row per cron job)
`job pk`, `last_attempt_at`, `last_success_at`, `consecutive_failures`, `last_error`, `alerted_at`. **Replaces the `sync_failures` log table §5 originally called for**: the only questions asked of it are "is the feed healthy?" and "how many failures in a row?", which a state row answers directly — a log would need a windowed query to derive consecutive-ness and would grow forever. Baker-readable only (`last_error` can echo feed URLs); Phase 4's Instagram sync reuses it.

### `inquiries`
`date`, `occasion`, `size`, `flavour`, `message text nullable`, `notes text nullable`, `reference_link text nullable`, `style_tag text nullable`, `preferred_name text NOT NULL`, `ig_handle text nullable`, `status` (enum: submitted | needs_quote | quoted | confirmed | completed | cancelled), `status_changed_at timestamptz`, `internal_notes text nullable`, `notification_status` (enum: pending | sent | failed), `notification_last_attempt_at timestamptz nullable`, `submitted_at`.

### `inquiry_photos`
`inquiry_id fk`, `storage_path`, `sort_order`. App-layer enforced cap at 6.

### RLS summary
- `cakes`, `ig_media`, `config`, `blocked_dates`: **anon SELECT** (`availability_rules` was folded into `config` — see migration 0001)
- `sync_state`: **baker SELECT only**; written by the cron worker's service role
- `inquiries`, `inquiry_photos`: **anon INSERT** only via authenticated service role from the Route Handler; **authenticated SELECT/UPDATE** for the baker
- Storage: `cakes/` public read; `inquiry-photos/` private, signed URLs for baker
- Storage upload path: uploads go to `pending/{session_id}/*`; `submit-inquiry` moves them to `bound/{inquiry_id}/*`; nightly cron sweeps `pending/*` older than 24h

**Deferred to v1.5 migrations** (YAGNI now):
- `ig_thread_id` on inquiries
- `order_events` audit table
- `set_status()` RPC + check-constraint state machine

---

## 4. Route map

### Public (`app/(public)/`)
| Route | Screen | Notes |
|---|---|---|
| `/` | Home | ISR, revalidate hourly |
| `/cakes` | Gallery | Merges `cakes` + `ig_media`, ISR |
| `/cakes/[slug]` | Cake detail | ISR |
| `/order/date` | Step 1 — Pick date | Reads `blocked_dates` |
| `/order/details` | Step 2 — Order details | Client form state |
| `/order/references` | Step 3 — Reference photos | Signed-URL upload to `pending/` |
| `/order/review` | Step 4 — Review | POSTs to `/api/submit-inquiry` |
| `/order/sent` | Confirmation | Shows IG deep link `ig.me/m/{handle}?text=...&ref=inquiry_{id}` + desktop fallback |
| `/flavours` | Flavours & pricing | Static |
| `/faq` | FAQ & policies | MDX, includes cottage-food disclosure |
| `/weddings` | Weddings landing | |
| `/weddings/inquiry` | Weddings form | Reuses `/api/submit-inquiry`, `occasion='wedding'` |

### Baker (`app/(baker)/`) — magic-link auth
| Route | Screen |
|---|---|
| `/baker/login` | Magic link (with backup email address in config for spam-filter safety) |
| `/baker/orders` | Dashboard, capacity meter, order list |
| `/baker/orders/[id]` | Inquiry detail, status controls, internal notes |
| `/baker/calendar` | Blocked-dates view (read-only, sourced from ICS) |
| `/baker/cakes` | Manage curated gallery |
| `/baker/settings` | Edit `config` (incl. ICS URL, backup email), IG hidden-media |
| `/baker/notifications` | Unnotified inquiries (from nightly alert) |

---

## 5. Key flows

### Inquiry submission
1. Customer completes 4 steps → `/order/review` POSTs to `/api/submit-inquiry` Next.js Route Handler.
2. Route Handler:
   - Validate with Zod
   - Insert `inquiries` row (`notification_status='pending'`)
   - Move photos from `pending/{session_id}/` to `bound/{inquiry_id}/`
   - Insert `inquiry_photos` rows
   - Fire Resend email; on success set `notification_status='sent'`, on failure `notification_status='failed'` (don't fail the request)
   - Return `{ inquiry_id, ig_deep_link }`
3. Redirect to `/order/sent` with the deep link.
4. IG deep link: `https://ig.me/m/{handle}?text={prefilled}&ref=inquiry_{id}`
   - Desktop / IG-not-installed fallback: `/order/sent` also shows "Or DM @handle on Instagram" copy-to-clipboard prefilled text + a plain `mailto:` link to the baker as ultimate fallback.
5. **Idempotency**: client generates a UUID, sent as `Idempotency-Key` header. Duplicate keys within 60s return the original response (Postgres unique index on `(idempotency_key)` with 24h TTL cleanup).
6. **Rate limit**: Cloudflare Rate Limiting rule (not app-code), 5 submits per IP per hour.

### Calendar sync (ICS)
1. Cron every 60 min: worker fetches the ICS URL from its `BAKERY_ICS_URL` secret (a published calendar URL is secret-by-unguessability, so it belongs with the other Cloudflare secrets, not in a DB column).
2. Parses events, upserts `blocked_dates` (date + reason from event title), then prunes ics-sourced dates that fell out of the feed. Upsert-before-prune, so a run that dies halfway over-blocks rather than freeing a taken date.
3. On fetch failure: retain existing `blocked_dates` (fail open); record it in `sync_state`; on the 3rd consecutive failure email the baker **once**, resetting on recovery. A 200 that isn't a calendar counts as a failure — otherwise an expired link would parse as "no bookings" and un-block everything.
4. **Availability formula for v1**: a day is `unavailable` if in `blocked_dates` OR within `min_notice_days` of today. That's it. No capacity math from inquiry-status until v1.5.

### Nightly notification-failure alert
1. Cron nightly: worker queries `inquiries WHERE notification_status='failed' AND submitted_at > now() - '48h'`.
2. If any rows exist, email baker a summary + link to `/baker/notifications`.

### IG feed sync
1. Same cron worker, second trigger, hourly.
2. Calls Graph API `/{ig-user-id}/media`, pulls latest 25.
3. Upserts `ig_media`.
4. Long-lived token stored as Cloudflare secret; refreshed manually every ~50 days (setting a calendar reminder is cheaper than a token-refresh worker for this cadence).

### IG DM linking (v1.5, post-Meta-app-review)
1. Webhook receives DM with `ref=inquiry_{id}` from initial ig.me link.
2. v1.5 migration adds `ig_thread_id` column, populated here.
3. Dashboard shows thread on `/baker/orders/[id]`.

---

## 6. Design system implementation

- CSS custom properties in `lib/ui/tokens.css` — ink, paper, hairline, 3 state colors + 5 category colors.
- `<Chip variant="violet|coral|amber|category-{name}">` — only way to apply these colors. No raw hex in components.
- `<Button variant="primary|secondary|ghost">` — primary is always solid ink, never a state color.
- Contrast lint: Storybook a11y addon + CI grep flags any `rgba(25,25,24,` with opacity < 0.55 in `.tsx`/`.css`.
- Photo grids: CSS grid with `masonry` fallback via `react-photo-album`.
- Loading states: skeleton screens using paper-tinted shimmer.
- Error states: coral inline text + coral chip border, per the state-color rule.
- Font: `font-display: swap` fallback to prevent flash-of-invisible-text on the paper background.

---

## 7. Testing strategy

**Frameworks:** Vitest (unit), Playwright (E2E), pgTAP (RLS).

**Coverage requirements — v1 must ship with tests for these paths:**

```
[+] lib/domain/availability.ts
    ├── blocked date → unavailable
    ├── date within min_notice_days → unavailable
    ├── open date → open
    └── timezone edge (submission at 11:55pm local vs UTC)

[+] app/api/submit-inquiry (Route Handler)
    ├── valid payload → 200 + inquiry row + Resend fires
    ├── duplicate Idempotency-Key within 60s → returns original
    ├── rate limit exceeded → 429 (Cloudflare edge)
    ├── invalid payload → 422 with field errors
    ├── Resend fails → inquiry still saved, notification_status='failed'
    └── > 6 photos → rejected 422

[+] RLS (pgTAP)
    ├── anon cannot SELECT inquiries or inquiry_photos
    ├── anon cannot INSERT inquiries directly (only service role)
    ├── baker (authenticated) can SELECT/UPDATE inquiries
    └── baker cannot read Storage objects outside bound/ prefix

[+] E2E (Playwright, mobile viewport 390x844)
    ├── Full funnel: home → date → details → refs → review → sent
    ├── Validation blocks Next on missing occasion/size/flavour
    ├── /order/sent contains ?ref=inquiry_{id} in the deep link
    └── Desktop fallback text is visible when navigator.userAgent lacks Instagram
```

CI blocks merges on any failing test.

---

## 8. Sprint plan

### Sprint 0 — Foundations (~1 day)
- Next.js scaffold, Tailwind + tokens, Instrument Sans self-hosted
- Supabase project, migrations, RLS policies, seed data
- pgTAP tests for RLS running in CI
- Cloudflare Pages deploy pipeline, preview envs
- `lib/ui` primitives: Chip, Button, Input, Radio, PhotoGrid
- Baker magic-link auth working

### Sprint 1 — Public read + order flow (~5–7 days)
- Home, Gallery (curated only), Cake detail
- 4-step order flow with client state
- `/api/submit-inquiry` Route Handler with idempotency, Resend, notification_status tracking
- Cloudflare rate limit rule applied
- `/order/sent` with IG deep link + desktop/no-IG fallback UX
- Flavours & FAQ pages
- Playwright E2E for the full funnel, Vitest for availability + Route Handler

### Sprint 2 — Baker dashboard + cron worker (~3–4 days)
- One Wrangler worker with two cron triggers (ICS sync, IG feed sync)
- Nightly notification-failure alert (same worker, third trigger)
- `/baker/orders` list with capacity meter
- `/baker/orders/[id]` detail with status + internal notes
- `/baker/calendar` blocked-dates view
- `/baker/cakes` CRUD
- `/baker/notifications` failed-Resend queue

### Sprint 3 — Weddings + polish (~2 days)
- Weddings landing + inquiry form (reuses submit-inquiry)
- Cottage-food disclosure on FAQ
- PWA manifest, install prompt
- Cloudflare Web Analytics wiring
- QA pass, a11y audit

### v1.5 — IG DM integration (post-v1)
- **Day 1 of v1 ship**: submit Meta app review for Messaging permissions
- Migration: add `ig_thread_id` on inquiries, `order_events` table if timeline view is wanted
- Webhook handler + thread linking
- Baker DM view inside `/baker/orders/[id]`

---

## 9. Open questions

1. **IG Business account**: Does she already have IG Business/Creator linked to a Facebook Page? If not, ~15min setup blocks IG feed sync.
2. **ICS URL**: Does she use Google Calendar / Apple Calendar / other? All support published ICS URLs. She'll need a dedicated calendar for "Creamy Creation Bookings" — cleaner than parsing her personal calendar.
3. **Cottage food disclosure**: Need her to draft or copy the exact SC DHEC required language.
4. **Photo retention**: How long for reference photos on cancelled/declined inquiries? Recommend 30 days then auto-delete.
5. **Domain**: `creamycreation.com`? Cloudflare-hosted DNS?
6. **Baker email addresses**: Primary + backup (magic-link fallback if primary is spam-filtered)?
7. **Wedding tasting bookings**: v1 = baker schedules manually via DM and updates status only? (Recommend yes.)
8. **Food safety certification (blocker, no ETA)**: She does not yet hold the SC cottage-food certification/course. Development is unaffected, but **production cutover (§14) should not happen until this is complete** — see §15. Track completion date here once known.

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| Meta app review rejected or slow (>6wk) | v1 works without DMs; feature is additive |
| ICS fetch fails | Fail open (retain cached `blocked_dates`); 3 consecutive failures emails baker |
| HEIC uploads from iOS are huge | Client-side conversion + resize via `browser-image-compression` before upload |
| Solo-baker unavailability | `/order/sent` sets expectation ("reply within 1 day"); vacation-mode toggle in settings disables date selection |
| Spam via public form | Cloudflare rate limit + hCaptcha invisible on abuse spike (deploy reactively) |
| Resend outage / delivery failure | `notification_status` column + nightly alert (§5) |
| Magic-link email spam-filtered | Backup email address in config, both receive magic links |
| **Launching before food safety cert is complete** | Real regulatory/liability exposure, not just a UX gap — treat as a **hard gate on production cutover** (§14), independent of code readiness. Dev/preview unaffected. |

---

## 11. NOT in scope for v1 (explicit deferrals)

- In-app payments, deposits, invoicing
- Customer accounts, order history
- Native in-app messaging (v1.5 as IG DM webhook)
- Multi-tenant / multi-baker
- Push notifications (email only)
- Custom analytics dashboard (Cloudflare Web Analytics only)
- AI cake mockups, price estimator, recommendations
- Delivery / shipping
- SMS backup (add if Resend proves unreliable)
- Server-side IG posting on confirmation
- Native mobile app (PWA install only)
- `order_events` timeline (add in v1.5 migration if useful)
- State-machine RPC / check constraint enforcement (plain enum + app-layer transitions)

---

## 12. What already exists

Nothing — greenfield. Design principle for reuse: **keep `lib/domain/*` pure** (no Supabase imports, no framework deps). If a mobile app or multi-tenant version ever ships, that folder lifts unchanged.

---

## 13. Success metrics (post-v1)

- Funnel completion rate: `/order/date` → `/order/sent`
- Time-to-first-reply from baker (from `status_changed_at`)
- % of inquiries reaching `confirmed`
- Gallery → order flow conversion
- IG referral traffic to `/` (once she links from her IG bio)
- Resend delivery success rate (should be > 99.5%)

---

## 14. Config strategy — test values now, baker values on cutover

Three-tier layout, chosen so cutover from test data to real bakery data is an env-var edit, not a code or DB change.

| Config type | Lives in | Who edits | Examples |
|---|---|---|---|
| Identity + secrets | Cloudflare Pages env vars (per environment: dev/preview/prod) | You, via Cloudflare dashboard | Bakery name, IG handle, timezone, emails, ICS URL, API keys |
| Baker-tunable operational | Supabase `config` table (single row) | Baker via `/baker/settings` | Capacity, min-notice days, vacation mode |
| Prose content | MDX in `/content/` | Whoever owns copy | FAQ, cottage-food disclosure, flavour descriptions |

GitHub Actions secrets are skipped — Cloudflare Pages deploys directly from Git, so there's no CI runner that needs them. Adding a second secrets store would just be a place for values to drift out of sync.

**`.env.example`** (values below are placeholders/test data; production values go into Cloudflare's dashboard, never into git):

```bash
# --- Bakery identity (swap on cutover — see below) ---
BAKERY_NAME="Creamy Creation"
BAKERY_TAGLINE="Simple, elegant cakes. Made one at a time."
BAKERY_LOCATION="Indian Land, SC"
BAKERY_TIMEZONE="America/New_York"
BAKERY_IG_HANDLE="creamycreation"
BAKERY_IG_USER_ID=""
BAKERY_PRIMARY_EMAIL="you@example.com"
BAKERY_BACKUP_EMAIL="you+backup@example.com"
BAKERY_ICS_URL=""

# --- Domain (placeholder until purchased) ---
NEXT_PUBLIC_SITE_URL="https://creamy-creation.pages.dev"

# --- Supabase ---
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""

# --- Resend ---
RESEND_API_KEY=""
RESEND_FROM="orders@creamy-creation.pages.dev"

# --- Instagram Graph API ---
IG_LONG_LIVED_TOKEN=""
```

- `lib/config.ts` validates these against a Zod schema at boot — missing/malformed vars fail the build, not a customer's request at 3am.
- **Cutover procedure** (Sprint 3 or whenever she's ready): update the prod environment's values in the Cloudflare Pages dashboard, trigger a redeploy. Dev/preview environments keep test values untouched. No code change, no migration, no downtime.
- Domain: **no domain purchased yet** — `NEXT_PUBLIC_SITE_URL` defaults to the `*.pages.dev` Cloudflare subdomain as a placeholder. Swap to a real domain the same way, whenever one's bought.

---

## 15. Licensing — cottage food operation

This is two separate license questions: **the code's license** and **the business's legal operating license.** Different owners, different urgency.

### Code license (this repo)
Not decided yet — private/proprietary is the safe default until stated otherwise, since this is a specific person's business, not an open-source tool. Recommend: no public license file yet (defaults to "all rights reserved" under copyright law), revisit only if you ever want to open-source the scaffold itself (e.g. as a generic "home-bakery-in-a-box" template).

### Business operating license (South Carolina cottage food law) — for her, not code
South Carolina's Cottage Food Law lets home bakers sell certain non-hazardous baked goods without a commercial kitchen, under DHEC (Dept. of Health and Environmental Control) rules. What's actually needed, based on current SC DHEC guidance — **verify directly with DHEC before launch, this is not legal advice**:

- **No SC-specific cottage food *permit* is required** for items on the approved list (cakes, cookies, breads — non-perishable, shelf-stable, no cream cheese/custard/cream fillings that require refrigeration).
- **A food safety course / certification** is commonly required or recommended (e.g., ServSafe or SC DHEC-approved equivalent) — confirm current requirement.
- **Required label/disclosure language** on any point of sale or marketing material stating the item was made in a home kitchen not inspected by DHEC — this is the copy that goes into `/content/faq.mdx` (§9 open question #3, still needs her exact wording, ideally DHEC's suggested phrasing).
- **Sales/use tax registration** with SC Dept. of Revenue if she's charging sales tax — separate from DHEC, a business-registration matter.
- **Refrigerated fillings (buttercream is fine, cream cheese frosting typically is not)** may push a cake outside "cottage food" into requiring a licensed commercial kitchen — worth her confirming per-recipe.
- Selling at a physical location vs. delivery vs. pickup-only (her model, pickup-only) can affect requirements — pickup-only is generally the most permissive setup.

**Action item, not a code task**: she should call SC DHEC (or check dhec.sc.gov's cottage food page) directly to confirm current rules before the site goes live with real orders. The app should treat the disclosure text as **required content, not optional copy** — it's a compliance surface, not marketing.

**Current status: she does not yet hold the certification.** This does not block development — dev/preview environments are fine running with placeholder disclosure text and test config values. It **does** block production cutover (§14): don't point real customers at a live order flow, and don't finalize the disclosure copy, until the cert is done and its scope (which fillings/items are covered) is known. Treat "cert complete" as a go-live prerequisite alongside domain purchase and baker config values, tracked in §9 Q8.
