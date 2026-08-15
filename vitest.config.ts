import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

// Root Vitest config. Unit and integration tests for the pure-logic packages
// run in the node environment. Component tests (jsdom) are added per package
// in the frontend test workstream, where React resolves from that package.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./apps/web/src", import.meta.url)),
    },
  },
  test: {
    projects: [
      {
        resolve: {
          alias: {
            "@": fileURLToPath(new URL("./apps/web/src", import.meta.url)),
          },
        },
        test: {
          name: "node",
          environment: "node",
          include: [
            "packages/shared/**/*.{test,spec}.ts",
            "packages/data/**/*.{test,spec}.ts",
            "packages/ai/**/*.{test,spec}.ts",
            "packages/ui/**/*.{test,spec}.ts",
            "packages/deploy/**/*.{test,spec}.ts",
            "apps/*/src/lib/**/*.{test,spec}.{ts,tsx}",
          ],
          exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/.turbo/**"],
        },
      },
    ],
  },
});
