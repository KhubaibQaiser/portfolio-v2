import { describe, expect, it } from "vitest";
import {
  applyTailoredResume,
  formatExpLocation,
  stableExperienceIndex,
  type ResumeData,
} from "./resume-data";

const base: ResumeData = {
  name: "Test User",
  title: "Senior Software Engineer",
  email: "test@example.com",
  location: "Remote",
  website: "example.com",
  socialLinks: [],
  summary: "Base summary.",
  keywords: "React, TypeScript",
  visibleSections: ["experience", "skills", "education"],
  experience: [
    {
      company: "Alpha Co",
      role: "Senior Engineer",
      period: "2024 – Present",
      location: "SF · Remote",
      contractType: "Full-time",
      bullets: ["Built things."],
      tech: "React",
    },
    {
      company: "Beta Co",
      role: "Engineer",
      period: "2022 – 2024",
      location: "NYC · Remote",
      contractType: "Full-time",
      bullets: ["Shipped features."],
      tech: "Node.js",
    },
    {
      company: "Gamma Co",
      role: "Junior Engineer",
      period: "2018 – 2022",
      location: "Austin · Remote",
      contractType: "Full-time",
      bullets: ["Learned a lot."],
      tech: "JavaScript",
    },
  ],
  education: [
    { degree: "BS CS", institution: "State U", year: "2018" },
  ],
  certifications: [],
  skills: [{ category: "Frontend", items: ["React", "TypeScript"] }],
};

describe("formatExpLocation", () => {
  it("formats city and location type compactly", () => {
    expect(formatExpLocation("San Francisco, CA", "remote")).toBe(
      "San Francisco, CA · Remote",
    );
  });
});

describe("stableExperienceIndex", () => {
  it("maps stable ids to zero-based indices", () => {
    expect(stableExperienceIndex("e1")).toBe(0);
    expect(stableExperienceIndex("e3")).toBe(2);
    expect(stableExperienceIndex("bad")).toBeNull();
  });
});

describe("applyTailoredResume", () => {
  it("includes only tailored experiences in AI order", () => {
    const result = applyTailoredResume(base, {
      summary: "Tailored summary.",
      keywords: ["React"],
      titleOverride: "Staff Engineer",
      experiences: [
        {
          experienceId: "e2",
          bullets: [{ text: "Rewritten beta bullet." }],
        },
        {
          experienceId: "e1",
          bullets: [{ text: "Rewritten alpha bullet." }],
        },
      ],
      skills: [{ category: "Frontend", items: ["React"] }],
    });

    expect(result.title).toBe("Staff Engineer");
    expect(result.summary).toBe("Tailored summary.");
    expect(result.experience).toHaveLength(2);
    expect(result.experience[0]!.company).toBe("Beta Co");
    expect(result.experience[1]!.company).toBe("Alpha Co");
    expect(result.experience[0]!.bullets[0]).toBe("Rewritten beta bullet.");
  });

  it("drops experiences omitted from tailored payload", () => {
    const result = applyTailoredResume(base, {
      summary: "Short.",
      keywords: [],
      experiences: [
        {
          experienceId: "e1",
          bullets: [{ text: "Only alpha." }],
        },
      ],
      skills: [],
    });

    expect(result.experience).toHaveLength(1);
    expect(result.experience[0]!.company).toBe("Alpha Co");
  });
});
