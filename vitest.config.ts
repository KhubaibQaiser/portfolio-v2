import { defineConfig } from "vitest/config";

// Root Vitest config. Unit and integration tests for the pure-logic packages
// run in the node environment. Component tests (jsdom) are added per package
// in the frontend test workstream, where React resolves from that package.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "node",
          environment: "node",
          include: [
            "packages/shared/**/*.{test,spec}.ts",
            "packages/data/**/*.{test,spec}.ts",
            "packages/ai/**/*.{test,spec}.ts",
            "packages/ui/**/*.{test,spec}.ts",
            "packages/deploy/**/*.{test,spec}.ts",
            "apps/*/src/lib/**/*.{test,spec}.ts",
          ],
          exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/.turbo/**"],
        },
      },
    ],
  },
});
