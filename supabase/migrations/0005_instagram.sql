-- Phase 4 — Instagram feed sync.
--
-- `ig_media` mirrors `blocked_dates`'s shape: a cache the cron worker rebuilds
-- from the Graph API, safe to re-sync from scratch. Unlike blocked_dates there's
-- no column secret here (nothing in an IG post is private), but there IS a row
-- filter: `is_hidden` lets the baker pull an item from the public gallery
-- (a bad photo, an unrelated post) without touching Instagram itself.
--
-- `sync_state` is reused, not re-created — PLAN.md §3 called this out
-- specifically ("Phase 4's Instagram sync reuses it"). One more job row,
-- keyed 'instagram', answers the same "healthy? how many failures?" questions
-- the calendar sync already does, for free.

create table public.ig_media (
  id            uuid        primary key default gen_random_uuid(),
  ig_media_id   text        not null unique,
  caption       text,
  media_url     text        not null,
  permalink     text        not null,
  thumbnail_url text,
  media_type    text        not null check (media_type in ('IMAGE', 'VIDEO', 'CAROUSEL_ALBUM')),
  posted_at     timestamptz not null,
  is_hidden     boolean     not null default false,
  synced_at     timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index ig_media_posted_at_idx on public.ig_media (posted_at desc);

alter table public.ig_media enable row level security;

-- The public gallery reads only what the baker hasn't hidden.
create policy "visible ig media is publicly readable"
  on public.ig_media for select to anon, authenticated
  using (is_hidden = false);

-- The baker's settings page needs the hidden ones too, to un-hide them.
create policy "all ig media is readable by baker"
  on public.ig_media for select to authenticated
  using (public.is_baker());

-- Only the toggle is baker-writable — the row content itself (caption, url,
-- ...) always comes from the sync, via the service role. The RLS policy alone
-- only gates which ROWS are eligible, not which COLUMNS — so the update grant
-- is narrowed to is_hidden the same way 0004 narrowed blocked_dates' SELECT,
-- making "can't hand-edit what a post says" an actual guarantee, not a
-- convention the app happens to follow.
create policy "baker may hide or unhide ig media"
  on public.ig_media for update to authenticated
  using (public.is_baker())
  with check (public.is_baker());

revoke update on public.ig_media from authenticated;
grant update (is_hidden) on public.ig_media to authenticated;

-- No INSERT/DELETE policies: only the cron worker's service role creates or
-- removes rows (a post deleted on Instagram falls out of the /media response
-- and is pruned the same way blocked_dates prunes stale ics rows).

insert into public.sync_state (job) values ('instagram')
on conflict (job) do nothing;
