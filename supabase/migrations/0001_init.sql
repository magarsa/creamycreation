-- Phase 0 — initial schema.
--
-- `config` holds the baker-tunable operational values (PLAN.md §3, §14).
-- Bakery IDENTITY (name, handle, emails, ICS url) is NOT here — it lives in
-- Cloudflare Pages env vars so cutover is an env edit, not a DB migration.
--
-- Note: PLAN.md originally listed a separate `availability_rules` table with the
-- same fields as config. That was redundant (DRY smell caught in review), so the
-- two are consolidated into `config`. Availability computation (Phase 3) reads
-- min_notice_days / max_cakes_per_week from here.

create table if not exists public.config (
  id                 uuid primary key default gen_random_uuid(),
  max_cakes_per_week integer     not null default 3,
  min_notice_days    integer     not null default 7,
  pickup_window      text        not null default 'Sat 10am–2pm',
  vacation_mode      boolean     not null default false,
  vacation_message   text,
  created_at         timestamptz not null default now()
);

-- Row Level Security: the public funnel must READ config (min-notice, vacation
-- banner), but only the baker (authenticated) or the service role may write.
alter table public.config enable row level security;

create policy "config is publicly readable"
  on public.config
  for select
  to anon, authenticated
  using (true);

create policy "config is writable by authenticated baker"
  on public.config
  for update
  to authenticated
  using (true)
  with check (true);
