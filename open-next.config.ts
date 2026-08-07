import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Minimal config for Phase 0. ISR/data cache overrides (e.g. R2 incremental
// cache) can be added when the gallery starts using ISR — see
// https://opennext.js.org/cloudflare/caching
export default defineCloudflareConfig({});
