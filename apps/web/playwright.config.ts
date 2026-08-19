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
          // Fixture/seed content's `about.photo_url` and testimonial avatars
          // point at this real R2 bucket (see packages/data/seed/content.json
          // and apps/web/.env.example). Without it, next/image rejects every
          // render as an unconfigured host and the dev server never returns
          // a healthy response for Playwright's webServer readiness check.
          MEDIA_PUBLIC_BASE_URL: "https://pub-22656635402b446b8d3ef37bc1be7feb.r2.dev",
        },
      },
});
