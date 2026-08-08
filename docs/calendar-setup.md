# Calendar setup

How the site knows which days are already taken.

The baker keeps her bookings in an ordinary calendar app. That calendar publishes
a private link, and once an hour a Cloudflare Worker reads it and writes the
booked days into `blocked_dates`. The public date picker greys those days out.

```
Google/Apple Calendar          Cloudflare Worker            Supabase            The site
"Chen order, Sep 20"           (creamycreation-cron)
        │                              │                       │                    │
        │  published .ics URL          │                       │                    │
        │◀──── fetch, hourly ──────────│                       │                    │
        │                              │  parse → date keys    │                    │
        │                              │──── upsert ──────────▶│  blocked_dates     │
        │                              │                       │◀── read ───────────│
        │                              │                       │                    │  Sep 20 greyed out
```

**The calendar is the source of truth.** `blocked_dates` is a cache — safe to
delete, rebuilt on the next tick. To free up a date, delete the event in the
calendar; don't edit the database.

---

## 1. Make a dedicated calendar

Use a *separate* calendar named something like "Creamy Creation Bookings", not
the personal one. Two reasons: dentist appointments shouldn't block cake orders,
and the published link is readable by anyone who has it.

## 2. Publish it as ICS

**Google Calendar** — Settings → *Settings for my calendars* → pick the calendar
→ **Integrate calendar** → copy **Secret address in iCal format**. It ends in
`/basic.ics`.

**Apple / iCloud** — right-click the calendar in the sidebar → **Share Calendar**
→ tick **Public Calendar** → copy the link. It starts `webcal://`; change that to
`https://` before using it.

> The "secret address" is a password in URL form. Anyone holding it can read every
> event on that calendar. Keep it out of git — it goes in as a Cloudflare secret,
> not in `wrangler.jsonc`. If it leaks, use *Reset* in Google Calendar to rotate it.

## 3. Give it to the worker

```bash
pnpm exec wrangler secret put BAKERY_ICS_URL --config workers/cron/wrangler.jsonc
```

The worker also needs these one-time secrets:

```bash
pnpm exec wrangler secret put SUPABASE_URL              --config workers/cron/wrangler.jsonc
pnpm exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config workers/cron/wrangler.jsonc
pnpm exec wrangler secret put RESEND_API_KEY            --config workers/cron/wrangler.jsonc
```

Non-secret values (timezone, alert recipient, site URL) are in
`workers/cron/wrangler.jsonc` under `vars`.

Then deploy it:

```bash
pnpm run cron:deploy
```

## 4. Check it worked

Open **/baker/calendar**. It shows the sync status at the top and every blocked
day below. A freshly deployed worker says *"Calendar not connected yet"* until
its first successful run — trigger one immediately instead of waiting for the
hour:

```bash
pnpm run cron:dev                       # then, in another terminal:
curl "http://localhost:8787/__scheduled?cron=20+*+*+*+*"
```

Add an all-day event to the bookings calendar, run the sync, and that date should
disappear from `/order/date`.

---

## How events are read

| In the calendar | Effect |
|---|---|
| All-day event on Sep 20 | Sep 20 blocked |
| All-day event Sep 1–4 | Sep 1, 2, 3 blocked (the end day is exclusive, as iCalendar defines it) |
| Timed event, 2–5pm Sep 20 | Sep 20 blocked — any event blocks the whole day |
| Event marked cancelled | Ignored |
| Repeating event | **Only the first occurrence blocks.** Recurrence rules aren't expanded — a standing "no cakes on Mondays" is a capacity rule, so set it in `/baker/settings` instead |

Only the next ~400 days are synced, and only days in that window are pruned.
Manually-added blocks (`source = 'manual'`) are never touched by the sync.

## When the feed breaks

The sync **fails open**: a bad run changes nothing, so the site keeps serving the
last good set of dates rather than throwing the calendar away and letting every
date look free.

- Runs 1 and 2 fail → counted, no email. Transient blips are normal.
- Run 3 fails → **one** email to the baker, and `/baker/calendar` shows a red
  banner. No further emails for that outage.
- Any run succeeds → the counter resets, and the next outage can alert again.

A 200 response that isn't a calendar (a login page, an error page) counts as a
failure rather than "no bookings" — otherwise an expired link would silently
un-block every date.

The trade-off while a feed is broken: dates the baker booked *since* the last good
sync are still shown as available, so an inquiry can arrive for a taken day. She
declines it in the dashboard. That's the deliberate choice — the reverse failure
(everything looks booked) loses every sale until someone notices.

## Cadence

Hourly at :20 (`workers/cron/wrangler.jsonc` → `triggers.crons`). A booking added
to the calendar shows on the site within the hour. Same-day bookings aren't a
race worth solving: the minimum-notice rule already puts every bookable date at
least a week out.
