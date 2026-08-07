import { z } from "zod";

/*
 * Environment configuration — the single switch point between YOUR test values
 * now and the BAKER's real values at launch (PLAN.md §14). Bakery identity and
 * secrets live in Cloudflare Pages env vars, not the database, so cutover is an
 * env edit + redeploy, no code change.
 *
 * parseServerEnv() is pure so it is unit-testable, and so a missing or malformed
 * variable fails loudly with a readable message instead of surfacing as
 * `undefined` deep inside a request handler at 3am.
 *
 * Vars marked .optional() are not wired until a later phase (noted inline); they
 * become required as those phases land.
 */
const serverEnvSchema = z.object({
  // Bakery identity (swapped per environment)
  BAKERY_NAME: z.string().min(1),
  BAKERY_TAGLINE: z.string().min(1),
  BAKERY_LOCATION: z.string().min(1),
  BAKERY_TIMEZONE: z.string().min(1),
  BAKERY_IG_HANDLE: z.string().min(1),
  BAKERY_PRIMARY_EMAIL: z.email(),
  BAKERY_BACKUP_EMAIL: z.email().optional(),

  // Public site
  NEXT_PUBLIC_SITE_URL: z.url(),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(), // Phase 1 (submit handler)

  // Resend — Phase 1
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM: z.email().optional(),

  // Calendar — Phase 3
  BAKERY_ICS_URL: z.url().optional(),

  // Instagram — Phase 4
  IG_LONG_LIVED_TOKEN: z.string().min(1).optional(),
  BAKERY_IG_USER_ID: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(
  env: Record<string, string | undefined> = process.env,
): ServerEnv {
  const result = serverEnvSchema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration. Fix these variables (see .env.example):\n${issues}`,
    );
  }
  return result.data;
}

let cached: ServerEnv | null = null;

/** Memoized, validated server env. Throws on first access if misconfigured. */
export function serverEnv(): ServerEnv {
  if (cached === null) cached = parseServerEnv();
  return cached;
}
