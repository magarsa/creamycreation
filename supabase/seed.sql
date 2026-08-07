-- Seed the single config row (idempotent: only inserts if the table is empty).
insert into public.config (max_cakes_per_week, min_notice_days, pickup_window, vacation_mode)
select 3, 7, 'Sat 10am–2pm', false
where not exists (select 1 from public.config);

-- Curated cakes for the gallery. image_path is null → renders the grey placeholder
-- until real photography is added. Idempotent on slug.
insert into public.cakes (title, slug, description, category, size, flavour, sort_order) values
  ('Classic Vanilla Birthday', 'classic-vanilla-birthday', 'A simple, elegant single-tier with soft buttercream and a hand-piped border.', 'birthday', '6" round · serves 8–10', 'Vanilla bean', 1),
  ('Chocolate Drip Celebration', 'chocolate-drip-celebration', 'Rich chocolate sponge under a glossy ganache drip.', 'birthday', '8" round · serves 14–18', 'Chocolate', 2),
  ('Number Cake for Kids', 'number-cake-for-kids', 'A playful number or letter shape, finished in bright buttercream.', 'kids', 'Custom shape', 'Funfetti', 3),
  ('Anniversary Rose', 'anniversary-rose', 'Understated and romantic, with piped roses and a soft palette.', 'anniversary', '6" round · serves 8–10', 'Red velvet', 4),
  ('Small Wedding Tier', 'small-wedding-tier', 'A two-tier semi-naked cake for intimate weddings, dressed with fresh flowers.', 'wedding', '2 tiers · serves ~40', 'Vanilla & berry', 5),
  ('Vanilla Cupcakes', 'vanilla-cupcakes', 'A dozen swirled buttercream cupcakes, perfect for sharing.', 'cupcakes', 'Dozen', 'Vanilla', 6)
on conflict (slug) do nothing;
