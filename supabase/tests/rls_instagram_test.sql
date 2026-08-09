-- pgTAP: RLS configuration for the Phase 4 ig_media table. Catalog-based, like
-- the other rls tests.
--
-- ig_media splits differently from blocked_dates: there's no column secret
-- here (nothing in an IG post is private), but there IS a row filter — anon
-- must never see is_hidden = true, while the baker sees everything so
-- settings can offer "un-hide". And unlike cakes (fully baker-managed), the
-- baker's write access here is narrowed to one column: is_hidden.
begin;

select plan(9);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.ig_media'::regclass),
  'RLS enabled on public.ig_media'
);

-- Two SELECT policies: anon's row-filtered one, and the baker's unfiltered one.
select is(
  (select count(*)::int from pg_policies
     where schemaname = 'public' and tablename = 'ig_media' and cmd = 'SELECT'),
  2,
  'ig_media has two SELECT policies (anon row-filtered, baker unfiltered)'
);
select ok(
  (select bool_or('anon' = any (roles)) from pg_policies
     where schemaname = 'public' and tablename = 'ig_media' and cmd = 'SELECT'),
  'anon may SELECT ig_media (the public gallery reads it)'
);

-- Column grant: authenticated (the baker) may update is_hidden only — the
-- sync's own content (caption, media_url, ...) isn't baker-editable.
select ok(
  has_column_privilege('authenticated', 'public.ig_media', 'is_hidden', 'update'),
  'baker may update is_hidden'
);
select ok(
  not has_column_privilege('authenticated', 'public.ig_media', 'caption', 'update'),
  'baker may NOT update caption (sync-owned content)'
);
select ok(
  not has_column_privilege('authenticated', 'public.ig_media', 'media_url', 'update'),
  'baker may NOT update media_url (sync-owned content)'
);

-- No INSERT/DELETE policies: only the cron worker's service role creates or
-- prunes rows.
select is(
  (select count(*)::int from pg_policies
     where schemaname = 'public' and tablename = 'ig_media'
       and cmd in ('INSERT', 'DELETE')),
  0,
  'no insert/delete policies on ig_media (service-role only)'
);

-- One post can only exist once — the worker's upsert depends on this.
select ok(
  (select exists (
     select 1 from pg_constraint
      where conrelid = 'public.ig_media'::regclass and contype = 'u'
        and pg_get_constraintdef(oid) ilike '%(ig_media_id)%'
   )),
  'ig_media_id is unique (the worker upserts on it)'
);

-- sync_state gained a second job row for the Instagram sync (reused, not a
-- new table — PLAN.md §3).
select is(
  (select count(*)::int from public.sync_state where job = 'instagram'),
  1,
  'the instagram sync_state row is seeded'
);

select * from finish();

rollback;
