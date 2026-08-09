# Instagram setup

How the gallery picks up new Instagram posts without the baker uploading
anything twice.

The bakery's Instagram is a **Business or Creator account**. Once an hour a
Cloudflare Worker calls the Graph API for the latest 25 posts and writes them
into `ig_media`. The public gallery merges those with the curated `cakes`.

```
Instagram Business account      Cloudflare Worker            Supabase            The site
"New cake photo posted"         (creamycreation-cron)
        │                              │                       │                    │
        │  Graph API, hourly           │                       │                    │
        │◀───── GET /media ────────────│                       │                    │
        │                              │  upsert by id          │                   │
        │                              │──────────────────────▶│  ig_media          │
        │                              │                       │◀── read ───────────│
        │                              │                       │                    │  new post appears
```

**Instagram is the source of truth.** `ig_media` is a cache — deleting a post
on Instagram removes it here on the next sync. To pull a photo from the
gallery *without* deleting the Instagram post, use **Hide** in
`/baker/settings` instead — that's a local-only flag the sync never touches.

---

## 1. Business/Creator account, connected to a Facebook Page

The Graph API only serves professional accounts. If the account is still
Personal: **Instagram app → Settings → Account type and tools → Switch to
professional account** → Business. It'll ask you to connect (or create) a
Facebook Page — any page works, it doesn't need followers or posts of its
own, it just has to exist and be linked.

## 2. Find the Instagram user ID

**Facebook Page → Settings → Instagram → Connected account** shows it, or use
the [Graph API Explorer](https://developers.facebook.com/tools/explorer/):
pick the app, then `GET /me/accounts` → the Page → `GET /{page-id}?fields=instagram_business_account`.
It's a long numeric string.

## 3. Generate a long-lived access token

1. Create a Meta app at [developers.facebook.com/apps](https://developers.facebook.com/apps)
   (any name — this app isn't submitted for review; a single-baker feed sync
   never leaves development mode).
2. Add the **Instagram** product, and under **API setup with Instagram
   login**, generate a token for the connected account with the
   `instagram_business_basic` permission (read-only — that's all this needs).
3. That token is short-lived. Exchange it once for a long-lived one:
   ```bash
   curl "https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=<APP_SECRET>&access_token=<SHORT_LIVED_TOKEN>"
   ```
   The response's `access_token` is the long-lived one — **that's** what goes
   to the worker, not the short-lived token from step 2.

> The token is a bearer credential: anyone holding it can read (not post as)
> the account. Keep it out of git — it goes in as a Cloudflare secret. If it
> leaks, revoking access in **Instagram app → Settings → Apps and websites**
> invalidates it immediately.

## 4. Give it to the worker

```bash
pnpm exec wrangler secret put IG_LONG_LIVED_TOKEN --config workers/cron/wrangler.jsonc
pnpm exec wrangler secret put BAKERY_IG_USER_ID   --config workers/cron/wrangler.jsonc
```

If the worker isn't deployed yet, or doesn't have its other secrets
(`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`) — see
[calendar-setup.md §3](calendar-setup.md#3-give-it-to-the-worker) first; the
Instagram sync shares the same worker and secrets.

Then deploy:

```bash
pnpm run cron:deploy
```

## 5. Check it worked

Open **/baker/settings** and scroll to "Instagram posts". A freshly connected
account shows nothing until the first successful sync, which happens at :40
past the hour.

### Triggering a sync now instead of waiting

Same pattern as the calendar sync — see
[calendar-setup.md](calendar-setup.md#triggering-a-sync-now-instead-of-waiting)
for the `.dev.vars` setup, then:

```bash
pnpm run cron:dev                       # then, in another terminal:
curl "http://localhost:8787/__scheduled?cron=40+*+*+*+*"
```

This writes to the **real** database.

---

## How posts are read

| Field | Where it goes |
|---|---|
| `id` | dedup key — a re-sync updates the existing row instead of duplicating it |
| `media_url` | the photo (or, for VIDEO, the raw video file — see below) |
| `thumbnail_url` | set only for VIDEO posts; the gallery shows this instead of the video file, since the tile is a static image |
| `caption` | shown under the tile in the gallery, if present |
| `permalink` | the tile links out to the actual Instagram post |
| `timestamp` | sort order — newest first, after the curated cakes |

Only the latest 25 posts are fetched (a Graph API page). A post that scrolls
past #25 stays in the gallery until it's actually deleted from Instagram — it
just stops getting re-synced, which doesn't change anything about it.

**Stories, Reels shown as VIDEO, and carousel posts** all sync; the gallery
tile is a single static image either way (the video file itself is never
played inline).

## Hiding a post

`/baker/settings` lists synced posts with a Hide/Show toggle. Hidden posts
stay in Instagram and stay in `ig_media` — they're just filtered out of the
public gallery (`is_hidden = true`). The sync never re-hides or un-hides a
post on its own; it's a one-way local decision until you change it back.

## When the feed breaks

The sync **fails open**, the same way the calendar sync does: a bad run
changes nothing, so the gallery keeps showing the last good set of posts.

- Runs 1 and 2 fail → counted, no email.
- Run 3 fails → **one** email to the baker. No further emails for that outage.
- Any run succeeds → the counter resets, and the next outage can alert again.

The most common cause by far is the token expiring (see below) — the error
message in the alert email says so directly.

## Token expiry — the one thing that needs manual upkeep

Long-lived tokens are valid for **60 days from issuance**, and Meta doesn't
auto-refresh them. **Refresh every ~50 days** (a 10-day buffer) — set a
calendar reminder now, because a token-refresh worker is more machinery than
this cadence is worth for a single account:

```bash
curl "https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=<CURRENT_LONG_LIVED_TOKEN>"
```

The response is a new token with a fresh 60-day clock — put it in as the
`IG_LONG_LIVED_TOKEN` secret again (step 4). Refreshing doesn't need the app
secret, just the current token, and it works anytime after the token is 24
hours old.

If it does lapse: the sync starts failing (see above), the gallery keeps
showing the last synced posts rather than going blank, and generating a new
token (step 3) fixes it on the next sync.

## Cadence

Hourly at :40 (`workers/cron/wrangler.jsonc` → `triggers.crons`), offset from
the calendar sync's :20 so the two never compete for the same invocation. A
new post shows on the site within the hour.
