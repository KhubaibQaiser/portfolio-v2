import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

// Root Vitest config. Shared logic uses the default project; app-route tests
// use an app-specific project so each `@` alias resolves to the correct source.
// Individual component tests opt into jsdom with a file environment directive.
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
            "packages/infra/**/*.{test,spec}.ts",
            "packages/agent-mcp/**/*.{test,spec}.ts",
            "apps/*/src/lib/**/*.{test,spec}.{ts,tsx}",
          ],
          exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/.turbo/**"],
        },
      },
      {
        resolve: {
          alias: {
            "@": fileURLToPath(new URL("./apps/admin/src", import.meta.url)),
          },
        },
        test: {
          name: "admin-app",
          environment: "node",
          include: ["apps/admin/src/app/**/*.{test,spec}.{ts,tsx}"],
          exclude: ["**/node_modules/**", "**/.next/**", "**/.turbo/**"],
        },
      },
    ],
  },
});
