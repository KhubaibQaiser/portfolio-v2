import { describe, expect, it } from "vitest";
import { googleSiteVerificationTxtValue } from "./google-site-verification";

describe("googleSiteVerificationTxtValue", () => {
  it("keeps the Google prefix when already present", () => {
    expect(googleSiteVerificationTxtValue("google-site-verification=xwhabc")).toBe(
      "google-site-verification=xwhabc",
    );
  });

  it("adds the prefix when given only the token", () => {
    expect(googleSiteVerificationTxtValue("xwhabc")).toBe(
      "google-site-verification=xwhabc",
    );
  });

  it("strips wrapping quotes from Route 53 / console copy-paste", () => {
    expect(googleSiteVerificationTxtValue('"google-site-verification=xwhabc"')).toBe(
      "google-site-verification=xwhabc",
    );
  });

  it("rejects empty or whitespace-only input", () => {
    expect(() => googleSiteVerificationTxtValue("")).toThrow(/empty/);
    expect(() => googleSiteVerificationTxtValue("   ")).toThrow(/empty/);
  });
});
