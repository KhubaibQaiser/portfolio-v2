import { describe, expect, it } from "vitest";
import { formatAtsEmploymentPeriod } from "./format-ats-employment-period";

describe("formatAtsEmploymentPeriod", () => {
  it("normalizes MM/YYYY ranges to spaced hyphens", () => {
    expect(formatAtsEmploymentPeriod("08/2024-07/2026")).toBe("08/2024 - 07/2026");
    expect(formatAtsEmploymentPeriod("08/2024 – 07/2026")).toBe("08/2024 - 07/2026");
  });
});
