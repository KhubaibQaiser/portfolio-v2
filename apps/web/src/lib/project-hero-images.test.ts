import { describe, expect, it } from "vitest";
import { projectHeroImages } from "./project-hero-images";

describe("projectHeroImages", () => {
  it("puts the cover first, then gallery images with fallback alt text", () => {
    expect(
      projectHeroImages({
        title: "Demo",
        cover_url: "https://m.example.com/cover.png",
        gallery: [
          { url: "https://m.example.com/a.png", alt: "Dashboard" },
          { url: "https://m.example.com/b.png", alt: "" },
        ],
      }),
    ).toEqual([
      { url: "https://m.example.com/cover.png", alt: "Demo" },
      { url: "https://m.example.com/a.png", alt: "Dashboard" },
      { url: "https://m.example.com/b.png", alt: "Demo screenshot 2" },
    ]);
  });

  it("returns nothing when there is no cover and no gallery", () => {
    expect(
      projectHeroImages({ title: "Demo", cover_url: null, gallery: undefined }),
    ).toEqual([]);
  });

  it("works with a gallery but no cover", () => {
    expect(
      projectHeroImages({
        title: "Demo",
        cover_url: null,
        gallery: [{ url: "https://m.example.com/a.png", alt: "" }],
      }),
    ).toHaveLength(1);
  });
});
