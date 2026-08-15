import { describe, expect, it } from "vitest";
import { classicGuidelines } from "@portfolio/shared/schemas";

import { buildCandidateFacts } from "../context/build-candidate-facts";
import {
  enforceResumeGenerationPolicy,
  ResumePolicyError,
} from "./resume-generation-policy";

const facts = buildCandidateFacts({
  siteConfig: {
    name: "Test User",
    title: "Senior Engineer",
    email: "test@example.com",
    location: "Remote",
    social_links: [],
  },
  resume: {
    default_summary:
      "Senior engineer building reliable product platforms with React and TypeScript.",
    education: [],
    certifications: [],
  },
  experiences: [
    {
      id: "experience-uuid",
      company: "Source Company",
      role: "Senior Engineer",
      location: "Remote",
      location_type: "remote",
      contract_type: "full_time",
      start_date: "Jan 2024",
      end_date: null,
      description: "Built React products.\nImproved platform reliability.",
      tech_tags: ["React", "TypeScript"],
    },
  ],
  skills: [
    { category: "frontend", name: "React" },
    { category: "frontend", name: "TypeScript" },
  ],
});

const validResume = {
  summary:
    "Senior engineer building reliable React and TypeScript products with clear customer and platform impact.",
  titleOverride: null,
  keywords: ["React", "TypeScript"],
  highlightedSkills: ["React"],
  experiences: [
    {
      experienceId: "experience-uuid",
      bullets: [
        {
          experienceId: "experience-uuid",
          sourceBulletIndex: 0,
          text: "Built reliable **React** products for customers.",
        },
      ],
    },
  ],
  skills: [{ category: "Frontend & UI", items: ["React", "TypeScript"] }],
};

describe("enforceResumeGenerationPolicy", () => {
  it("accepts immutable source ids and canonical skills", () => {
    const result = enforceResumeGenerationPolicy(validResume, facts, classicGuidelines());

    expect(result.resume.experiences[0]?.experienceId).toBe("experience-uuid");
    expect(result.resume.highlightedSkills).toEqual(["React"]);
  });

  it("rejects positional ids in new generations", () => {
    expect(() =>
      enforceResumeGenerationPolicy(
        {
          ...validResume,
          experiences: [
            {
              ...validResume.experiences[0],
              experienceId: "e1",
              bullets: [
                {
                  ...validResume.experiences[0]!.bullets[0]!,
                  experienceId: "e1",
                },
              ],
            },
          ],
        },
        facts,
        classicGuidelines(),
      ),
    ).toThrow(ResumePolicyError);
  });

  it("rejects unknown and invalid highlighted skills", () => {
    expect(() =>
      enforceResumeGenerationPolicy(
        { ...validResume, highlightedSkills: ["Invented.js"] },
        facts,
        classicGuidelines(),
      ),
    ).toThrow(ResumePolicyError);
  });

  it("rejects duplicate source bullet references", () => {
    expect(() =>
      enforceResumeGenerationPolicy(
        {
          ...validResume,
          experiences: [
            {
              ...validResume.experiences[0],
              bullets: [
                validResume.experiences[0]!.bullets[0]!,
                {
                  ...validResume.experiences[0]!.bullets[0]!,
                  text: "A second rewrite of the same unsupported source.",
                },
              ],
            },
          ],
        },
        facts,
        classicGuidelines(),
      ),
    ).toThrow(ResumePolicyError);
  });

  it("rejects numeric claims and technologies absent from canonical facts", () => {
    expect(() =>
      enforceResumeGenerationPolicy(
        {
          ...validResume,
          experiences: [
            {
              ...validResume.experiences[0],
              bullets: [
                {
                  ...validResume.experiences[0]!.bullets[0]!,
                  text: "Built Kubernetes products that improved conversion by 40%.",
                },
              ],
            },
          ],
        },
        facts,
        classicGuidelines(),
      ),
    ).toThrow(ResumePolicyError);
  });
});
