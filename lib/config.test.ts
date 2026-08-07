import { describe, expect, it } from "vitest";
import { parseServerEnv } from "./config";

const valid = {
  BAKERY_NAME: "Creamy Creation",
  BAKERY_TAGLINE: "Simple, elegant cakes. Made one at a time.",
  BAKERY_LOCATION: "Indian Land, SC",
  BAKERY_TIMEZONE: "America/New_York",
  BAKERY_IG_HANDLE: "creamycreation",
  BAKERY_PRIMARY_EMAIL: "baker@example.com",
  NEXT_PUBLIC_SITE_URL: "https://example.com",
  NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
};

describe("parseServerEnv", () => {
  it("accepts a valid environment", () => {
    expect(() => parseServerEnv(valid)).not.toThrow();
    expect(parseServerEnv(valid).BAKERY_NAME).toBe("Creamy Creation");
  });

  it("throws with a readable message when a required var is missing", () => {
    const missing: Record<string, string> = { ...valid };
    delete missing.NEXT_PUBLIC_SUPABASE_URL;
    expect(() => parseServerEnv(missing)).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("throws when an email var is malformed", () => {
    expect(() =>
      parseServerEnv({ ...valid, BAKERY_PRIMARY_EMAIL: "not-an-email" }),
    ).toThrow();
  });

  it("leaves not-yet-wired secrets optional", () => {
    // Phase 1+ vars (service role, Resend) are absent in `valid` and must not throw.
    expect(() => parseServerEnv(valid)).not.toThrow();
  });
});
