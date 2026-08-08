/*
 * Bakery identity — the single switch point between placeholder values now and
 * the real baker's details at launch (PLAN.md §14): edit the env vars and
 * redeploy, no code change. Read at call time (not module scope) to match the
 * pattern already used for BAKERY_IG_HANDLE / BAKERY_PRIMARY_EMAIL, and falls
 * back to the current placeholder copy so a build/CI run without these vars
 * set still succeeds — same graceful-degradation approach as lib/db/queries.ts.
 *
 * Server-only: several of these are non-NEXT_PUBLIC vars, so this must not be
 * imported from a Client Component. Client-side callers (e.g. the date picker)
 * receive what they need as props from a Server Component instead.
 */
export function bakeryIdentity() {
  return {
    name: process.env.BAKERY_NAME || "Creamy Creation",
    tagline:
      process.env.BAKERY_TAGLINE || "Simple, elegant cakes. Made one at a time.",
    location: process.env.BAKERY_LOCATION || "Indian Land, SC",
    timezone: process.env.BAKERY_TIMEZONE || "America/New_York",
    igHandle: process.env.BAKERY_IG_HANDLE || "creamycreation",
  };
}
