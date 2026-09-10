import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

// End to end tests for the public site. By default Playwright starts the dev
// server in fixture mode so the suite runs without any cloud dependency.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          DATA_BACKEND: "fixture",
          AUTH_MODE: "dev",
          // Demo seed photo host (packages/data/seed/content.json). Private
          // content.local.json may use a different CDN — set MEDIA_PUBLIC_BASE_URL
          // in .env.local when developing against local seed.
          MEDIA_PUBLIC_BASE_URL: "https://cdn.example.com",
          // Force committed demo so CI/e2e never pick up a developer's local CV.
          SEED_SOURCE: "committed",
        },
      },
});
