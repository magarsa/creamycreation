import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

// Wires Cloudflare bindings into `next dev` so local dev matches the Workers
// runtime. No-op outside dev. See open-next.config.ts / wrangler.jsonc.
initOpenNextCloudflareForDev();
