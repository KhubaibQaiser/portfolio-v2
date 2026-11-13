import { describe, expect, it } from "vitest";
import { isMediaUrl } from "./media-url";

const base = "https://media.example.com";

describe("isMediaUrl", () => {
  it("accepts https URLs on the media host", () => {
    expect(isMediaUrl("https://media.example.com/a/b.png", base)).toBe(true);
  });

  it("rejects other hosts, lookalikes, http, junk and a missing base", () => {
    for (const url of [
      "https://evil.example.net/a.png",
      "https://media.example.com.evil.net/a.png",
      "http://media.example.com/a.png",
      "javascript:alert(1)",
      "not a url",
    ]) {
      expect(isMediaUrl(url, base)).toBe(false);
    }
    expect(isMediaUrl("https://media.example.com/a.png", null)).toBe(false);
    expect(isMediaUrl("https://media.example.com/a.png", undefined)).toBe(false);
  });
});
