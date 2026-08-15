import { describe, expect, it } from "vitest";
import { tailoredResumeSchema } from "./tailored-resume";

const legacyPayload = {
  summary:
    "Senior engineer delivering reliable React and TypeScript platforms with measurable product impact.",
  keywords: ["React"],
  experiences: [
    {
      experienceId: "e1",
      bullets: [
        {
          experienceId: "e1",
          sourceBulletIndex: 0,
          text: "Delivered a reliable React platform for production customers.",
        },
      ],
    },
  ],
  skills: [{ category: "Frontend", items: ["React"] }],
};

describe("tailoredResumeSchema", () => {
  it("defaults highlighted skills for stored generations created before the field", () => {
    expect(tailoredResumeSchema.parse(legacyPayload).highlightedSkills).toEqual([]);
  });

  it("rejects an excessive highlighted-skill payload", () => {
    expect(() =>
      tailoredResumeSchema.parse({
        ...legacyPayload,
        highlightedSkills: Array.from({ length: 26 }, (_, index) => `Skill ${index}`),
      }),
    ).toThrow();
  });
});
