-- Phase 1 — core funnel schema: cakes (curated gallery), inquiries, inquiry_photos.
--
-- Design notes:
--  * `category` is one shared enum for cakes.category AND inquiries.occasion — the
--    label-maker system (PLAN.md §6) keeps a category the same color everywhere.
--  * inquiries are INSERTed only by the submit-inquiry Route Handler using the
--    service role (which bypasses RLS). There is deliberately NO insert policy, so
--    the public anon key cannot write inquiries directly (spam/abuse control, §5).
--  * PLAN.md called the date column `date`; using `event_date` to avoid the SQL
--    reserved word.

-- ── Enums ────────────────────────────────────────────────────────────────────
create type public.category as enum (
  'birthday', 'kids', 'anniversary', 'wedding', 'cupcakes', 'just_because'
);

create type public.inquiry_status as enum (
  'submitted', 'needs_quote', 'quoted', 'confirmed', 'completed', 'cancelled'
);

create type public.notification_status as enum ('pending', 'sent', 'failed');

-- ── cakes (curated gallery) ──────────────────────────────────────────────────
create table public.cakes (
  id          uuid primary key default gen_random_uuid(),
  title       text            not null,
  slug        text            not null unique,
  description text,
  category    public.category not null,
  size        text,
  flavour     text,
  image_path  text,            -- storage path in the `cakes` bucket; null = grey placeholder
  sort_order  integer         not null default 0,
  is_active   boolean         not null default true,
  created_at  timestamptz     not null default now()
);

alter table public.cakes enable row level security;

create policy "active cakes are publicly readable"
  on public.cakes for select to anon, authenticated
  using (is_active = true);

create policy "cakes are managed by authenticated baker"
  on public.cakes for all to authenticated
  using (true) with check (true);

-- ── inquiries ────────────────────────────────────────────────────────────────
create table public.inquiries (
  id                            uuid primary key default gen_random_uuid(),
  event_date                    date                       not null,
  occasion                      public.category            not null,
  size                          text                       not null,
  flavour                       text                       not null,
  message                       text,
  notes                         text,
  reference_link                text,
  style_tag                     text,
  preferred_name                text                       not null,
  ig_handle                     text,
  status                        public.inquiry_status      not null default 'submitted',
  status_changed_at             timestamptz                not null default now(),
  internal_notes                text,
  notification_status           public.notification_status not null default 'pending',
  notification_last_attempt_at  timestamptz,
  idempotency_key               text unique,               -- dedupes double-tap submits (§5)
  submitted_at                  timestamptz                not null default now(),
  created_at                    timestamptz                not null default now()
);

alter table public.inquiries enable row level security;

-- No INSERT policy: only the service role (RLS-bypassing) writes inquiries.
create policy "inquiries readable by authenticated baker"
  on public.inquiries for select to authenticated using (true);

create policy "inquiries updatable by authenticated baker"
  on public.inquiries for update to authenticated using (true) with check (true);

-- ── inquiry_photos ───────────────────────────────────────────────────────────
create table public.inquiry_photos (
  id           uuid primary key default gen_random_uuid(),
  inquiry_id   uuid        not null references public.inquiries(id) on delete cascade,
  storage_path text        not null,
  sort_order   integer     not null default 0,
  created_at   timestamptz not null default now()
);

create index inquiry_photos_inquiry_id_idx on public.inquiry_photos (inquiry_id);

alter table public.inquiry_photos enable row level security;

-- No INSERT policy: written by the service role alongside the inquiry.
create policy "inquiry_photos readable by authenticated baker"
  on public.inquiry_photos for select to authenticated using (true);

-- ── Storage buckets ──────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('cakes', 'cakes', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('inquiry-photos', 'inquiry-photos', false)
on conflict (id) do nothing;

-- cakes bucket is public-read by virtue of public=true; authenticated baker manages files.
create policy "authenticated manages cake images"
  on storage.objects for all to authenticated
  using (bucket_id = 'cakes') with check (bucket_id = 'cakes');

-- inquiry-photos is private; the baker (authenticated) can read. Customer uploads use
-- short-lived signed upload URLs minted server-side (service role), so no anon policy.
create policy "authenticated reads inquiry photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'inquiry-photos');
