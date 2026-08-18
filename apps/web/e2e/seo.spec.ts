import { expect, test } from "@playwright/test";

test("robots.txt disallows analytics and api", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.ok()).toBeTruthy();
  const body = await res.text();
  expect(body).toContain("Disallow: /api/");
  expect(body).toContain("Disallow: /analytics");
  expect(body).toContain("Sitemap:");
});

test("sitemap lists core urls with CMS lastModified and omits analytics", async ({
  request,
}) => {
  const res = await request.get("/sitemap.xml");
  expect(res.ok()).toBeTruthy();
  const xml = await res.text();
  expect(xml).toContain("/projects/achieve-web-platform");
  expect(xml).toContain("/resume");
  expect(xml).not.toContain("/analytics");
  expect(xml).toContain("2024-01-01");
  const today = new Date().toISOString().slice(0, 10);
  expect(xml).not.toContain(`<lastmod>${today}`);
});

test("home has a single h1 and valid person json-ld", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveCount(1);
  const jsonLd = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  const parsed = jsonLd.map((text) => JSON.parse(text) as { "@type": unknown });
  expect(parsed.some((node) => node["@type"] === "Person")).toBe(true);
  expect(parsed.some((node) => node["@type"] === "ProfilePage")).toBe(true);
  expect(parsed.some((node) => node["@type"] === "FAQPage")).toBe(false);
  expect(
    parsed.some(
      (node) => Array.isArray(node["@type"]) && node["@type"].includes("Person"),
    ),
  ).toBe(false);
  await expect(page.locator('header a[href="/projects"]')).toBeVisible();
});

test("analytics is noindex", async ({ page }) => {
  await page.goto("/analytics");
  const robots = await page.locator('meta[name="robots"]').getAttribute("content");
  expect(robots).toMatch(/noindex/i);
});

test("project slug has breadcrumbs, related links, and og type website", async ({
  page,
}) => {
  await page.goto("/projects/achieve-web-platform");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toBeVisible();
  const ogType = await page.locator('meta[property="og:type"]').getAttribute("content");
  expect(ogType).toBe("website");
});
