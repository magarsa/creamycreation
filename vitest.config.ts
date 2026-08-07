import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Mirror the tsconfig "@/*" path alias so `@/lib/...` resolves in tests.
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    // Default to node; component tests opt into jsdom with
    // `// @vitest-environment jsdom` at the top of the file.
    environment: "node",
    include: ["lib/**/*.test.{ts,tsx}", "app/**/*.test.{ts,tsx}"],
  },
});
