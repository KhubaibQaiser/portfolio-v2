import { describe, expect, it } from "vitest";
import {
  classicLayoutForm,
  modernBlueLayoutForm,
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
});
