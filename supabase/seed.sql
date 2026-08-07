-- Seed the single config row (idempotent: only inserts if the table is empty).
insert into public.config (max_cakes_per_week, min_notice_days, pickup_window, vacation_mode)
select 3, 7, 'Sat 10am–2pm', false
where not exists (select 1 from public.config);
