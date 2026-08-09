-- Adds a required contact email to new inquiries, alongside the existing
-- optional Instagram handle. The Instagram deep-link handoff only reaches the
-- baker if the customer actually taps through and sends the DM — if they
-- abandon that step, an ig_handle they typed (or didn't) isn't something the
-- baker can act on: Instagram's messaging rules don't let a business
-- initiate a DM to someone who hasn't messaged first. Email is the
-- platform-independent fallback that always works.
--
-- Nullable at the DB level on purpose: existing rows predate this field and
-- genuinely have no email on file — backfilling them with a placeholder would
-- be fake data. "Required" is enforced at the application layer (the Zod
-- schema in lib/domain/order.ts) for every new submission going forward.

alter table public.inquiries add column email text;
