import { describe, expect, it } from "vitest";
import {
  isAllowedAtsTitle,
  lintAtsResumeContent,
  scanBannedUnicode,
  scanHyphenatedCompounds,
} from "./ats-resume-content-rules";

describe("ats-resume-content-rules", () => {
  it("rejects disallowed titles", () => {
    expect(isAllowedAtsTitle("Staff Engineer")).toBe(false);
    expect(isAllowedAtsTitle("Senior Software Engineer")).toBe(true);
  });

  it("flags banned unicode", () => {
    expect(scanBannedUnicode("foo — bar")).toContain("\u2014");
  });

  it("allows proper noun hyphens", () => {
    expect(scanHyphenatedCompounds("Content-to-Commerce platform")).toEqual([]);
    expect(scanHyphenatedCompounds("data-driven design")).toEqual(["data-driven"]);
  });

  it("lint rejects markdown bold", () => {
    const result = lintAtsResumeContent("Summary.", ["Built **React** apps."], null);
    expect(result.violations.some((v) => v.includes("markdown bold"))).toBe(true);
  });
});
