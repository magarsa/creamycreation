-- pgTAP tests for RLS on the Phase 0 schema. Run with: pnpm db:test
-- (requires the local Supabase stack running: `supabase start`).
begin;

select plan(4);

-- 1. RLS is actually enabled on config (a disabled RLS is a silent hole).
select ok(
  (select relrowsecurity from pg_class where relname = 'config'),
  'RLS is enabled on public.config'
);

-- Switch to the anonymous (public visitor) role for the access checks.
set local role anon;

-- 2. Anon CAN read config (the public funnel needs min-notice / vacation state).
select lives_ok(
  $$ select 1 from public.config limit 1 $$,
  'anon can SELECT from config'
);

-- 3. Anon CANNOT insert into config. INSERT has no permissive policy, so RLS
--    raises insufficient_privilege (42501) — an INSERT cannot be silently filtered.
select throws_ok(
  $$ insert into public.config (min_notice_days) values (14) $$,
  '42501',
  null,
  'anon INSERT into config is rejected by RLS'
);

-- 4. Anon CANNOT update config. Note: unlike INSERT, an UPDATE with no matching
--    policy does NOT throw — RLS filters the rows to zero. So we assert the write
--    had no effect rather than expecting an error. (Seed row has vacation_mode=false.)
update public.config set vacation_mode = true;
select is(
  (select bool_or(vacation_mode) from public.config),
  false,
  'anon UPDATE on config modifies no rows (RLS filtered)'
);

select * from finish();

rollback;
