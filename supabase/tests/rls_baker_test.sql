-- pgTAP: Phase 2 baker-auth RLS config. Catalog-based, like the other rls tests.
begin;

select plan(6);

-- is_baker() exists (used by RLS + the app gate).
select ok(
  (select exists (select 1 from pg_proc where proname = 'is_baker')),
  'public.is_baker() exists'
);

-- bakers allowlist: RLS on, and NO policies → only the service role touches it.
select ok(
  (select relrowsecurity from pg_class where oid = 'public.bakers'::regclass),
  'RLS enabled on public.bakers'
);
select is(
  (select count(*)::int from pg_policies
     where schemaname = 'public' and tablename = 'bakers'),
  0,
  'bakers has no policies (service-role only)'
);

-- inquiries: exactly one SELECT and one UPDATE policy, both authenticated-scoped
-- (now gated by is_baker() inside the policy).
select is(
  (select count(*)::int from pg_policies
     where tablename = 'inquiries' and cmd = 'SELECT'),
  1,
  'inquiries has one SELECT policy'
);
select is(
  (select count(*)::int from pg_policies
     where tablename = 'inquiries' and cmd = 'UPDATE'),
  1,
  'inquiries has one UPDATE policy'
);

-- Still no INSERT policy → inquiries are written only by the service role.
select is(
  (select count(*)::int from pg_policies
     where tablename = 'inquiries' and cmd = 'INSERT'),
  0,
  'inquiries still has no INSERT policy'
);

select * from finish();

rollback;
