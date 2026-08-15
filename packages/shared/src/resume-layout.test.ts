import { describe, expect, it } from "vitest";
import {
  classicLayoutForm,
  modernBlueLayoutForm,
  normalizeResumeLayoutGuidelines,
  pickDefaultResumeLayout,
  resumeLayoutSchema,
  variantGuidelinesSchema,
} from "./schemas";

describe("resume layout guidelines", () => {
  it("parses seeded Classic and Modern Blue forms", () => {
    expect(resumeLayoutSchema.safeParse(classicLayoutForm()).success).toBe(true);
    expect(resumeLayoutSchema.safeParse(modernBlueLayoutForm()).success).toBe(true);
  });

  it("picks the default layout, then the first row, then null", () => {
    const classic = {
      id: "a",
      ...classicLayoutForm(),
      is_default: false,
      created_at: "",
      updated_at: "",
    };
    const modern = {
      id: "b",
      ...modernBlueLayoutForm(),
      is_default: true,
      created_at: "",
      updated_at: "",
    };
    expect(pickDefaultResumeLayout([])).toBeNull();
    expect(pickDefaultResumeLayout([classic])?.id).toBe("a");
    expect(pickDefaultResumeLayout([classic, modern])?.id).toBe("b");
  });

  it("rejects an empty AI prompt template", () => {
    const guidelines = classicLayoutForm().guidelines;
    const result = variantGuidelinesSchema.safeParse({
      ...guidelines,
      aiTailoringPromptTemplate: "",
    });
    expect(result.success).toBe(false);
  });

  it("normalizes stored Modern Blue v1 rows to the strict v4 print contract", () => {
    const legacy = modernBlueLayoutForm().guidelines;
    legacy.formatting.typography.bodyFont = "Helvetica";
    legacy.sections.projects = true;

    const normalized = normalizeResumeLayoutGuidelines("modern-blue", 1, legacy);

    expect(normalized.formatting.typography.bodyFont).toBe("DM Sans");
    expect(normalized.sections.projects).toBe(false);
    expect(normalized.validation.maxPageCount).toBe(1);
    expect(normalized.validation.minExperienceItems).toBe(3);
    expect(normalized.validation.maxExperienceItems).toBe(8);
  });

  it("migrates Modern Blue v2 validation without replacing color overrides", () => {
    const stored = modernBlueLayoutForm().guidelines;
    stored.formatting.colorPalette.primary = "#123456";
    stored.validation.minExperienceItems = 5;

    const normalized = normalizeResumeLayoutGuidelines("modern-blue", 2, stored);

    expect(normalized.validation.minExperienceItems).toBe(3);
    expect(normalized.validation.maxPageCount).toBe(1);
    expect(normalized.validation.maxExperienceItems).toBe(8);
    expect(normalized.formatting.colorPalette.primary).toBe("#123456");
  });

  it("migrates Modern Blue v3 role limits without replacing custom colors", () => {
    const stored = modernBlueLayoutForm().guidelines;
    stored.validation.maxExperienceItems = 7;
    stored.formatting.colorPalette.primary = "#654321";

    const normalized = normalizeResumeLayoutGuidelines("modern-blue", 3, stored);

    expect(normalized.validation.maxExperienceItems).toBe(8);
    expect(normalized.formatting.colorPalette.primary).toBe("#654321");
  });
});
