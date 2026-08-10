-- Configurable pricing: base price by size, ranged add-on pricing, and a
-- snapshot of what a customer actually saw at submit time.
--
-- `sizes` and `addons` are baker-managed lists, same RLS shape as `cakes`
-- (public reads active rows, authenticated baker has full access). They are
-- deliberately NOT foreign-keyed from `inquiries.size` — that column stays
-- free text, unchanged, so nothing about existing inquiries or the cakes
-- gallery's own free-text size/flavour fields is affected.
--
-- `inquiry_addons` snapshots label + price at submit time (mirrors how
-- `inquiry_photos` relates to `inquiries`), so a later addon rename, reprice,
-- or delete never rewrites history the baker already quoted against.
-- `addon_id` is nullable with `on delete set null` for the same reason: the
-- snapshot survives the addon being deleted.

-- ── sizes ────────────────────────────────────────────────────────────────────
create table public.sizes (
  id               uuid primary key default gen_random_uuid(),
  label            text        not null,
  base_price_cents integer     not null,
  is_active        boolean     not null default true,
  sort_order       integer     not null default 0,
  created_at       timestamptz not null default now()
);

alter table public.sizes enable row level security;

create policy "active sizes are publicly readable"
  on public.sizes for select to anon, authenticated
  using (is_active = true);

create policy "sizes are managed by authenticated baker"
  on public.sizes for all to authenticated
  using (true) with check (true);

-- ── addons ───────────────────────────────────────────────────────────────────
create table public.addons (
  id              uuid primary key default gen_random_uuid(),
  label           text        not null,
  price_min_cents integer     not null,
  price_max_cents integer     not null,
  is_active       boolean     not null default true,
  sort_order      integer     not null default 0,
  created_at      timestamptz not null default now()
);

alter table public.addons enable row level security;

create policy "active addons are publicly readable"
  on public.addons for select to anon, authenticated
  using (is_active = true);

create policy "addons are managed by authenticated baker"
  on public.addons for all to authenticated
  using (true) with check (true);

-- ── inquiry_addons (snapshot join) ──────────────────────────────────────────
create table public.inquiry_addons (
  id              uuid primary key default gen_random_uuid(),
  inquiry_id      uuid        not null references public.inquiries(id) on delete cascade,
  addon_id        uuid        references public.addons(id) on delete set null,
  label           text        not null,
  price_min_cents integer     not null,
  price_max_cents integer     not null,
  created_at      timestamptz not null default now()
);

create index inquiry_addons_inquiry_id_idx on public.inquiry_addons (inquiry_id);

alter table public.inquiry_addons enable row level security;

-- No INSERT policy: written by the service role alongside the inquiry, same
-- as inquiry_photos.
create policy "inquiry_addons readable by authenticated baker"
  on public.inquiry_addons for select to authenticated using (true);

-- ── inquiries: the estimate the customer actually saw ───────────────────────
alter table public.inquiries
  add column estimated_price_min_cents integer,
  add column estimated_price_max_cents integer;

-- ── Seed defaults ────────────────────────────────────────────────────────────
-- Size labels match the previously-hardcoded SIZES list in lib/domain/order.ts
-- exactly, so nothing that already displays/matches on those strings (the e2e
-- funnel spec, existing cake gallery rows) needs to change. Prices are
-- placeholders — the baker sets real numbers via /baker/pricing.
insert into public.sizes (label, base_price_cents, sort_order) values
  ('6" round · serves 8–10', 4500, 0),
  ('8" round · serves 14–18', 6500, 1),
  ('10" round · serves 20–25', 8500, 2),
  ('Two tiers · serves ~40', 15000, 3),
  ('Dozen cupcakes', 3500, 4);

insert into public.addons (label, price_min_cents, price_max_cents, sort_order) values
  ('Fresh flowers', 1000, 2500, 0),
  ('Custom topper', 800, 2000, 1),
  ('Extra tier', 5000, 9000, 2);
