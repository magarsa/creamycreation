-- Phase 2 — baker auth. Access to the dashboard is gated by an allowlist of
-- emails (the `bakers` table), enforced in RLS via is_baker() — not just app
-- routing — so a stray authenticated session can never read inquiries.

create table if not exists public.bakers (
  email      text primary key,
  created_at timestamptz not null default now()
);

-- Only the service role touches this table; no anon/authenticated policies.
alter table public.bakers enable row level security;

-- True when the current JWT's email is on the allowlist. SECURITY DEFINER so it
-- can read `bakers` past that table's (deny-all) RLS. Callable via RPC too, so
-- the app layer can gate the dashboard with the same check.
create or replace function public.is_baker()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.bakers where email = (auth.jwt() ->> 'email')
  );
$$;

-- Tighten the Phase 1 policies from "any authenticated" to "is the baker".
drop policy if exists "inquiries readable by authenticated baker" on public.inquiries;
drop policy if exists "inquiries updatable by authenticated baker" on public.inquiries;
create policy "inquiries readable by baker" on public.inquiries
  for select to authenticated using (public.is_baker());
create policy "inquiries updatable by baker" on public.inquiries
  for update to authenticated using (public.is_baker()) with check (public.is_baker());

drop policy if exists "inquiry_photos readable by authenticated baker" on public.inquiry_photos;
create policy "inquiry_photos readable by baker" on public.inquiry_photos
  for select to authenticated using (public.is_baker());

drop policy if exists "cakes are managed by authenticated baker" on public.cakes;
create policy "cakes managed by baker" on public.cakes
  for all to authenticated using (public.is_baker()) with check (public.is_baker());

drop policy if exists "config is writable by authenticated baker" on public.config;
create policy "config writable by baker" on public.config
  for update to authenticated using (public.is_baker()) with check (public.is_baker());
