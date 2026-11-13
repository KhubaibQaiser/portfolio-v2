import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFixtureContentRepository } from "@portfolio/data";

const repo = createFixtureContentRepository();
vi.mock("@portfolio/data", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@portfolio/data")>()),
  getContentRepository: () => repo,
}));
vi.mock("@/lib/auth-guard", () => ({ requireAdmin: async () => ({ ok: true }) }));
vi.mock("@/lib/content-publish", () => ({ publishContentChanged: async () => {} }));

const { saveProject } = await import("@/lib/actions");

async function formFor(slug: string, gallery: Array<{ url: string; alt: string }>) {
  const [seed] = await repo.getProjects();
  const { id: _i, created_at: _c, updated_at: _u, revision: _r, ...form } = seed!;
  return { ...form, slug, gallery };
}

describe("saveProject gallery validation", () => {
  beforeEach(() => {
    vi.stubEnv("MEDIA_PUBLIC_BASE_URL", "https://media.example.com");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("rejects gallery images that are not on the media host", async () => {
    const result = await saveProject(
      null,
      await formFor("bad-gallery", [{ url: "https://evil.example.net/a.png", alt: "" }]),
    );

    expect(result).toEqual({
      success: false,
      error: "Gallery images must come from the media library.",
    });
    expect((await repo.getAllProjects()).some((p) => p.slug === "bad-gallery")).toBe(
      false,
    );
  });

  it("saves media-host gallery images with their alt text", async () => {
    const gallery = [{ url: "https://media.example.com/a.png", alt: "Dashboard" }];

    expect(await saveProject(null, await formFor("good-gallery", gallery))).toEqual({
      success: true,
    });
    expect(
      (await repo.getAllProjects()).find((p) => p.slug === "good-gallery")?.gallery,
    ).toEqual(gallery);
  });

  it("skips the host check when no media base URL is configured (local dev)", async () => {
    vi.stubEnv("MEDIA_PUBLIC_BASE_URL", "");

    expect(
      await saveProject(
        null,
        await formFor("dev-gallery", [{ url: "https://placehold.co/600x400", alt: "" }]),
      ),
    ).toEqual({ success: true });
  });
});
