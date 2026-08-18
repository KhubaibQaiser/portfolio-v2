import { describe, expect, it } from "vitest";
import { knowsAboutFromSkills, sameAsProfileUrls, twitterCreatorHandle } from "./json-ld";

describe("sameAsProfileUrls", () => {
  it("keeps http(s) profiles and drops tel, mailto, and the site url", () => {
    expect(
      sameAsProfileUrls(
        [
          { url: "https://github.com/khubaib" },
          { url: "tel:+123" },
          { url: "mailto:me@x.com" },
          { url: "https://khubaibqaiser.com" },
          { url: "https://github.com/khubaib" },
        ],
        "https://khubaibqaiser.com",
      ),
    ).toEqual(["https://github.com/khubaib"]);
  });
});

describe("twitterCreatorHandle", () => {
  it("extracts a handle from an x.com URL", () => {
    expect(
      twitterCreatorHandle([{ platform: "x", url: "https://x.com/khubaib_dev" }]),
    ).toBe("@khubaib_dev");
  });

  it("returns undefined when no twitter profile exists", () => {
    expect(
      twitterCreatorHandle([{ platform: "github", url: "https://github.com/x" }]),
    ).toBeUndefined();
  });
});

describe("knowsAboutFromSkills", () => {
  it("dedupes and prefers higher years", () => {
    expect(
      knowsAboutFromSkills(
        [
          { name: "React", years: 5, sort_order: 2 },
          { name: "react", years: 1, sort_order: 0 },
          { name: "AWS", years: 8, sort_order: 9 },
        ],
        2,
      ),
    ).toEqual(["AWS", "React"]);
  });
});
