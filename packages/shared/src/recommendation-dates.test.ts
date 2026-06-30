import { describe, expect, it } from "vitest";
import {
  formatRecommendationDate,
  parseRecommendationDate,
  sortRecommendationsByDateDesc,
} from "./recommendation-dates";

describe("recommendation-dates", () => {
  it("parses DD-MM-YYYY storage format", () => {
    const d = parseRecommendationDate("15-03-2024");
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(15);
  });

  it("formats for display", () => {
    expect(formatRecommendationDate("15-03-2024")).toBe("15 March 2024");
  });

  it("returns null for invalid dates", () => {
    expect(formatRecommendationDate("not-a-date")).toBeNull();
  });

  it("sorts latest first", () => {
    const sorted = sortRecommendationsByDateDesc([
      { recommended_at: "01-01-2020", id: "a" },
      { recommended_at: "15-06-2024", id: "b" },
      { recommended_at: "10-03-2024", id: "c" },
    ]);
    expect(sorted.map((r) => r.id)).toEqual(["b", "c", "a"]);
  });
});
