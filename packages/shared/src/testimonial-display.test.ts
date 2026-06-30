import { describe, expect, it } from "vitest";
import {
  RECOMMENDATION_DESCRIPTION_PREVIEW_MAX,
  truncateRecommendationDescription,
} from "./schemas/testimonial";

describe("truncateRecommendationDescription", () => {
  it("returns full text when under the preview limit", () => {
    const text = "Short recommendation.";
    expect(truncateRecommendationDescription(text)).toEqual({
      preview: text,
      isTruncated: false,
    });
  });

  it("truncates at a word boundary with ellipsis flag", () => {
    const text = "a".repeat(RECOMMENDATION_DESCRIPTION_PREVIEW_MAX + 50);
    const { preview, isTruncated } = truncateRecommendationDescription(text);
    expect(isTruncated).toBe(true);
    expect(preview.length).toBeLessThan(text.length);
    expect(preview.length).toBeLessThanOrEqual(RECOMMENDATION_DESCRIPTION_PREVIEW_MAX);
  });
});
