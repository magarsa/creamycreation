-- pgTAP: RLS configuration for the Phase 1 tables. Catalog-based (no role switch),
-- consistent with rls_test.sql. Behavioral checks (anon can't write inquiries,
-- service role can) are verified against the live project.
begin;

select plan(7);

-- RLS enabled on all three tables.
select ok(
  (select relrowsecurity from pg_class where oid = 'public.cakes'::regclass),
  'RLS enabled on public.cakes'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.inquiries'::regclass),
  'RLS enabled on public.inquiries'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.inquiry_photos'::regclass),
  'RLS enabled on public.inquiry_photos'
);

-- Cakes: anon may SELECT (public gallery).
select ok(
  (select bool_or('anon' = any (roles)) from pg_policies
     where schemaname = 'public' and tablename = 'cakes' and cmd = 'SELECT'),
  'anon may SELECT cakes'
);

-- Inquiries: no policy grants anon anything (baker-only; writes via service role).
select is(
  (select count(*)::int from pg_policies
     where schemaname = 'public' and tablename = 'inquiries' and 'anon' = any (roles)),
  0,
  'no inquiries policy grants anon'
);

-- Inquiries: no INSERT policy at all → only the service role can insert.
select is(
  (select count(*)::int from pg_policies
     where schemaname = 'public' and tablename = 'inquiries' and cmd = 'INSERT'),
  0,
  'no INSERT policy on inquiries (service-role only)'
);

-- inquiry_photos: no policy grants anon anything.
select is(
  (select count(*)::int from pg_policies
     where schemaname = 'public' and tablename = 'inquiry_photos' and 'anon' = any (roles)),
  0,
  'no inquiry_photos policy grants anon'
);

select * from finish();

rollback;
