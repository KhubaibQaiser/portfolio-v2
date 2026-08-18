import { expect, test } from "@playwright/test";

test("home page renders the hero", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/.+/);
  await expect(page.locator("main")).toBeVisible();
});

test("chat launcher opens the dialog", async ({ page }) => {
  await page.goto("/");
  const launcher = page.getByRole("button", { name: "Open AI chat" });
  await launcher.waitFor({ state: "attached", timeout: 15_000 });
  await expect
    .poll(async () => {
      const box = await launcher.boundingBox();
      return Boolean(box && box.width >= 20 && box.height >= 20);
    })
    .toBe(true);
  await launcher.dispatchEvent("click");
  await expect(page.getByRole("dialog", { name: "Ask Khubaib" })).toBeVisible();
  await expect(page.getByText(/Ask me anything about my experience/i)).toBeVisible();
});

test("resume page renders identity and the PDF download control", async ({ page }) => {
  await page.goto("/resume");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Download PDF" })).toBeVisible();
});

test("contact form blocks an empty submit with native required fields", async ({
  page,
}) => {
  await page.goto("/#contact");
  const contact = page.getByRole("region", { name: "Contact" });
  await expect(contact).toBeVisible();
  await contact.getByRole("button", { name: "Send Message" }).click();
  const nameMissing = await page.locator("#name").evaluate((el: HTMLInputElement) => {
    return el.validity.valueMissing;
  });
  expect(nameMissing).toBe(true);
  await expect(contact.getByText(/Message sent/i)).toHaveCount(0);
  await expect(contact.getByText(/Failed to send/i)).toHaveCount(0);
});
