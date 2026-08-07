-- pgTAP tests for RLS *configuration* on the Phase 0 schema. Run with: pnpm db:test
-- (requires the local Supabase stack: `supabase start`).
--
-- These assert the policy configuration via the system catalogs (run as the
-- default role — no role switching, so no dependency on pgTAP being executable
-- by `anon`). Actual row-level BEHAVIOR (anon can read the seed row, anon insert
-- is rejected with 401) is verified against the live project and can be expanded
-- here later with supabase_test_helpers.
begin;

select plan(5);

-- 1. RLS is enabled on config (a disabled RLS is a silent hole).
select ok(
  (select relrowsecurity from pg_class where oid = 'public.config'::regclass),
  'RLS is enabled on public.config'
);

-- 2. Exactly one SELECT policy exists.
select is(
  (select count(*)::int from pg_policies
     where schemaname = 'public' and tablename = 'config' and cmd = 'SELECT'),
  1,
  'config has a SELECT policy'
);

-- 3. That SELECT policy grants anon (the public funnel reads config).
select ok(
  (select 'anon' = any (roles) from pg_policies
     where schemaname = 'public' and tablename = 'config' and cmd = 'SELECT'),
  'anon is granted SELECT on config'
);

-- 4. No INSERT policy exists → inserts are denied by default under RLS.
select is(
  (select count(*)::int from pg_policies
     where schemaname = 'public' and tablename = 'config' and cmd = 'INSERT'),
  0,
  'config has no INSERT policy (inserts denied under RLS)'
);

-- 5. The UPDATE policy is scoped to authenticated only, never anon.
select ok(
  (select bool_and(roles = array['authenticated']::name[]) from pg_policies
     where schemaname = 'public' and tablename = 'config' and cmd = 'UPDATE'),
  'config UPDATE policy is limited to authenticated'
);

select * from finish();

rollback;
