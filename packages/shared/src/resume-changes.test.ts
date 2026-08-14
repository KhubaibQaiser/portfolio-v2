import { describe, expect, it } from "vitest";
import { describeAppliedResumeChanges } from "./resume-changes";
import type { ResumeData } from "./resume-data";

const base: ResumeData = {
  name: "Test",
  title: "Engineer",
  email: "a@b.com",
  location: "Remote",
  website: "example.com",
  socialLinks: [],
  summary: "Original summary.",
  keywords: "React",
  visibleSections: ["experience"],
  experience: [
    {
      company: "Alpha",
      role: "Eng",
      period: "2024 - Present",
      location: "Remote",
      contractType: "Full-time",
      bullets: ["Built the platform."],
      tech: "React",
    },
    {
      company: "Beta",
      role: "Eng",
      period: "2022 - 2024",
      location: "Remote",
      contractType: "Full-time",
      bullets: ["Shipped features."],
      tech: "Node",
    },
  ],
  projects: [],
  education: [],
  certifications: [],
  skills: [{ category: "Frontend", items: ["React"] }],
  languages: [],
  remoteWorkLine: null,
  referencesLine: null,
};

describe("describeAppliedResumeChanges", () => {
  it("reports summary, reorder, rewrite, and keyword highlighting", () => {
    const changes = describeAppliedResumeChanges(
      base,
      {
        summary: "JD-aligned summary.",
        titleOverride: "Staff Engineer",
        experiences: [
          {
            experienceId: "e1",
            bullets: [{ text: "Built the **React** platform.", sourceBulletIndex: 0 }],
          },
        ],
        skills: [{ category: "Cloud", items: ["AWS"] }],
      },
      "Staff Engineer",
    );

    expect(changes.some((c) => c.includes("Regenerated summary"))).toBe(true);
    expect(changes.some((c) => c.includes("Staff Engineer"))).toBe(true);
    expect(changes.some((c) => c.includes("Dropped"))).toBe(true);
    expect(changes.some((c) => c.includes("Highlighted"))).toBe(true);
    expect(changes.some((c) => c.includes("Cloud"))).toBe(true);
  });

  it("returns an empty list when nothing meaningful changed", () => {
    const changes = describeAppliedResumeChanges(base, {
      summary: "Original summary.",
      experiences: [
        {
          experienceId: "e1",
          bullets: [{ text: "Built the platform.", sourceBulletIndex: 0 }],
        },
        {
          experienceId: "e2",
          bullets: [{ text: "Shipped features.", sourceBulletIndex: 0 }],
        },
      ],
      skills: [{ category: "Frontend", items: ["React"] }],
    });
    expect(changes).toEqual([]);
  });
});
