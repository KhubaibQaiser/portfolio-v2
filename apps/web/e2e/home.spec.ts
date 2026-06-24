import { expect, test } from "@playwright/test";

// Smoke test for the public home page. Expands in the frontend test workstream
// to cover the project page, chat open and first response, resume, and contact.
test("home page renders the hero", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/.+/);
  await expect(page.locator("main")).toBeVisible();
});
