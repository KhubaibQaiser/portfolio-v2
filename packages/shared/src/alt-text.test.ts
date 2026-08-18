import { describe, expect, it } from "vitest";
import { altTextFromFilename } from "./alt-text";

describe("altTextFromFilename", () => {
  it("humanizes kebab and snake case", () => {
    expect(altTextFromFilename("hero-background.webp")).toBe("hero background");
    expect(altTextFromFilename("about_photo.png")).toBe("about photo");
  });

  it("falls back when the name is only an extension", () => {
    expect(altTextFromFilename(".png")).toBe(".png");
  });
});
