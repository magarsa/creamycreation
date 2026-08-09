/*
 * The cron worker's bindings. Same three-tier config strategy as the web app
 * (PLAN.md §14) — non-secret values in wrangler.jsonc `vars`, secrets set with
 * `wrangler secret put --config workers/cron/wrangler.jsonc`.
 *
 * Note SUPABASE_URL, not NEXT_PUBLIC_SUPABASE_URL: the NEXT_PUBLIC_ prefix only
 * means "inline this at Next build time", and nothing here is built by Next.
 *
 * All optional so a missing binding is a recorded sync failure with a readable
 * message rather than a worker that dies on boot — an unconfigured cron should
 * be visible on /baker/calendar, not silent.
 */
export interface CronEnv {
  // Calendar (secret — a published ICS URL is unguessable-by-design, not public)
  BAKERY_ICS_URL?: string;

  // Instagram (Phase 4). Both secret: the token is a bearer credential, and the
  // numeric IG user id is only meaningful paired with it.
  IG_LONG_LIVED_TOKEN?: string;
  BAKERY_IG_USER_ID?: string;

  // Identity
  BAKERY_TIMEZONE?: string;
  BAKERY_PRIMARY_EMAIL?: string;
  BAKERY_BACKUP_EMAIL?: string;
  SITE_URL?: string;

  // Supabase (service role — secret; the worker writes past RLS)
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;

  // Resend (secret) — used only for the sync-failure alert
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
}
