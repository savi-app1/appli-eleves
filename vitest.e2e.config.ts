import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Tests de bout en bout (HTTP) contre la version construite (`npm run build` d'abord) :
 * un serveur `next start` est lancé sur un port libre avec une base PGlite jetable et l'IA simulée.
 */
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/e2e/**/*.test.ts"],
    globalSetup: ["tests/e2e/server.ts"],
    testTimeout: 120_000,
    hookTimeout: 180_000,
    fileParallelism: false,
  },
});
