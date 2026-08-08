-- Phase 3 — calendar & real availability.
--
-- `blocked_dates` is a CACHE materialized from the baker's published ICS feed by
-- the cron worker (workers/cron). It is safe to truncate and rebuild: the feed is
-- the source of truth, this table just makes it readable by the public picker
-- without every visitor hitting Google Calendar.
--
-- Naming: PLAN.md §3 calls the column `date`. Using `blocked_date` instead, for
-- the same reason 0002 used `event_date` — `date` is a type name and reads badly
-- unquoted in queries.
--
-- `sync_state` deviates from PLAN.md §5's `sync_failures` log table on purpose.
-- The only questions anyone asks are "is the feed healthy?" and "how many
-- failures in a row?" — a one-row-per-job state table answers both directly,
-- where a growing log would need a windowed query to derive consecutive-ness and
-- would need pruning forever. Failure detail is kept in `last_error`.

-- ── blocked_dates ────────────────────────────────────────────────────────────
create table public.blocked_dates (
  id           uuid        primary key default gen_random_uuid(),
  blocked_date date        not null unique,
  source       text        not null default 'ics' check (source in ('ics', 'manual')),
  reason       text,        -- event title from the ICS feed; shown to the baker only
  synced_at    timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

-- No separate index on blocked_date: the UNIQUE constraint already provides one.

alter table public.blocked_dates enable row level security;

-- The public date picker must read these to grey out booked days.
create policy "blocked dates are publicly readable"
  on public.blocked_dates for select to anon, authenticated
  using (true);

-- ...but NOT the reason. `reason` is the calendar event title, straight from the
-- baker's personal calendar — "Chen order", "Dentist". The site never renders
-- it to a customer, but RLS is row-level: without this, anyone with the (public
-- by design) anon key could read every event title over the REST API. Column
-- grants are the right tool, and PostgREST enforces them.
revoke select on public.blocked_dates from anon;
grant select (id, blocked_date, source, synced_at, created_at)
  on public.blocked_dates to anon;

-- No INSERT/UPDATE/DELETE policies: only the cron worker writes, via the service
-- role. `/baker/calendar` is read-only in Phase 3.

-- ── sync_state ───────────────────────────────────────────────────────────────
create table public.sync_state (
  job                  text        primary key,   -- 'ics' now; 'instagram' in Phase 4
  last_attempt_at      timestamptz,
  last_success_at      timestamptz,
  consecutive_failures integer     not null default 0,
  last_error           text,
  alerted_at           timestamptz,               -- last alert email for the CURRENT streak
  updated_at           timestamptz not null default now()
);

alter table public.sync_state enable row level security;

-- Baker-only: sync health is operational detail, and last_error can echo URLs
-- from the feed. Written by the cron worker via the service role.
create policy "sync state readable by baker"
  on public.sync_state for select to authenticated
  using (public.is_baker());

-- Seed the row so /baker/calendar renders "never run" instead of empty before
-- the worker's first tick.
insert into public.sync_state (job) values ('ics')
on conflict (job) do nothing;
