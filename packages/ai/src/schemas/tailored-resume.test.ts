import { describe, expect, it } from "vitest";
import { storedTailoredResumeSchema, tailoredResumeSchema } from "./tailored-resume";
import { resumeExportRequestSchema } from "./resume-export";

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
  it("rejects missing provider fields", () => {
    expect(() => tailoredResumeSchema.parse(legacyPayload)).toThrow();
  });

  it("repairs known omissions when reading stored legacy generations", () => {
    expect(storedTailoredResumeSchema.parse(legacyPayload)).toMatchObject({
      titleOverride: null,
      highlightedSkills: [],
    });
  });

  it("rejects an excessive highlighted-skill payload", () => {
    expect(() =>
      tailoredResumeSchema.parse({
        ...legacyPayload,
        titleOverride: null,
        highlightedSkills: Array.from({ length: 26 }, (_, index) => `Skill ${index}`),
      }),
    ).toThrow();
  });

  it("blocks the reported export payload when keywords and skills are missing", () => {
    const {
      keywords: _keywords,
      skills: _skills,
      ...incompleteResume
    } = {
      ...legacyPayload,
      titleOverride: null,
      highlightedSkills: [],
    };
    const result = resumeExportRequestSchema.safeParse({
      generationId: "generation-id",
      resume: incompleteResume,
      layoutId: "layout-modern-blue",
      sourceHash: "source-hash",
      guidelineHash: "guideline-hash",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual(
        expect.arrayContaining(["resume.keywords", "resume.skills"]),
      );
    }
  });
});
