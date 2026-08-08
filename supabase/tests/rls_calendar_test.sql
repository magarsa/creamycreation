-- pgTAP: RLS configuration for the Phase 3 calendar tables. Catalog-based, like
-- the other rls tests.
--
-- The two tables sit on opposite sides of the same line: blocked_dates is read
-- by every visitor (the picker needs it), sync_state is operational detail only
-- the baker sees. Both are written exclusively by the cron worker's service role.
begin;

select plan(11);

-- ── blocked_dates ────────────────────────────────────────────────────────────
select ok(
  (select relrowsecurity from pg_class where oid = 'public.blocked_dates'::regclass),
  'RLS enabled on public.blocked_dates'
);

select ok(
  (select bool_or('anon' = any (roles)) from pg_policies
     where schemaname = 'public' and tablename = 'blocked_dates' and cmd = 'SELECT'),
  'anon may SELECT blocked_dates (the public picker reads it)'
);

-- Column grants, not just row policies: the picker needs the DATE, but `reason`
-- is a calendar event title off the baker's personal calendar and must not be
-- readable with the (publicly shipped) anon key.
select ok(
  has_column_privilege('anon', 'public.blocked_dates', 'blocked_date', 'select'),
  'anon may read blocked_date'
);
select ok(
  not has_column_privilege('anon', 'public.blocked_dates', 'reason', 'select'),
  'anon may NOT read reason (event titles stay private)'
);

-- No write policies: the ICS cache is rebuilt only by the service role, so a
-- leaked anon key can never open up or block a date.
select is(
  (select count(*)::int from pg_policies
     where schemaname = 'public' and tablename = 'blocked_dates'
       and cmd in ('INSERT', 'UPDATE', 'DELETE')),
  0,
  'no write policies on blocked_dates (service-role only)'
);

-- One date can only be blocked once — the worker's upsert depends on this.
select ok(
  (select exists (
     select 1 from pg_constraint
      where conrelid = 'public.blocked_dates'::regclass and contype = 'u'
        and pg_get_constraintdef(oid) ilike '%(blocked_date)%'
   )),
  'blocked_date is unique (the worker upserts on it)'
);

-- source is constrained, so a typo can't create a category the prune step
-- silently skips (it only ever deletes source = 'ics').
select ok(
  (select exists (
     select 1 from pg_constraint
      where conrelid = 'public.blocked_dates'::regclass and contype = 'c'
        and pg_get_constraintdef(oid) ilike '%ics%manual%'
   )),
  'source is restricted to ics/manual'
);

-- ── sync_state ───────────────────────────────────────────────────────────────
select ok(
  (select relrowsecurity from pg_class where oid = 'public.sync_state'::regclass),
  'RLS enabled on public.sync_state'
);

select is(
  (select count(*)::int from pg_policies
     where schemaname = 'public' and tablename = 'sync_state' and 'anon' = any (roles)),
  0,
  'no sync_state policy grants anon (last_error is baker-only)'
);

select is(
  (select count(*)::int from pg_policies
     where schemaname = 'public' and tablename = 'sync_state'
       and cmd in ('INSERT', 'UPDATE', 'DELETE')),
  0,
  'no write policies on sync_state (service-role only)'
);

-- The seeded row is what /baker/calendar renders as "not connected yet".
select is(
  (select count(*)::int from public.sync_state where job = 'ics'),
  1,
  'the ics sync_state row is seeded'
);

select * from finish();

rollback;
