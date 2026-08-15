import { describe, expect, it } from "vitest";
import { filterExperienceForResume } from "./schemas/experience";
import { filterProjectsForResume } from "./schemas/project";
import {
  applyTailoredResume,
  formatExpLocation,
  getResumeData,
  getValidatedHighlightedSkills,
  stableExperienceIndex,
  type ResumeContentSource,
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
      startDate: "Jan 2024",
      endDate: null,
      period: "2024 - Present",
      location: "SF · Remote",
      contractType: "Full-time",
      bullets: ["Built things."],
      tech: "React",
    },
    {
      company: "Beta Co",
      role: "Engineer",
      startDate: "Jan 2022",
      endDate: "Jan 2024",
      period: "2022 - 2024",
      location: "NYC · Remote",
      contractType: "Full-time",
      bullets: ["Shipped features."],
      tech: "Node.js",
    },
    {
      company: "Gamma Co",
      role: "Junior Engineer",
      startDate: "Jan 2018",
      endDate: "Jan 2022",
      period: "2018 - 2022",
      location: "Austin · Remote",
      contractType: "Full-time",
      bullets: ["Learned a lot."],
      tech: "JavaScript",
    },
  ],
  projects: [],
  education: [{ degree: "BS CS", institution: "State U", year: "2018" }],
  certifications: [],
  skills: [{ category: "Frontend", items: ["React", "TypeScript"] }],
  languages: [{ name: "English", level: "Fluent" }],
  remoteWorkLine: "Remote-first.",
  referencesLine: "References available on request",
};

function emptyProjectsRepo(
  overrides: Partial<ResumeContentSource> = {},
): ResumeContentSource {
  return {
    getSiteConfig: async () => ({
      id: "site-config",
      name: "Test User",
      title: "Engineer",
      email: "test@example.com",
      location: "Remote",
      description: "Test bio.",
      social_links: [],
      tech_stack: [],
      created_at: "",
      updated_at: "",
    }),
    getResume: async () => ({
      id: "resume",
      default_summary: "Summary.",
      education: [
        {
          degree: "BS",
          institution: "State U",
          year: "2020",
          url: null,
        },
      ],
      certifications: [],
      visible_sections: ["experience", "projects"],
      is_projects_visible: true,
      voice_sample: null,
      languages: [{ name: "English", level: "Fluent" }],
      remote_work_line: "Remote-first.",
      references_line: "References available on request",
      created_at: "",
      updated_at: "",
    }),
    getExperience: async () => [
      {
        id: "1",
        company: "Visible Co",
        role: "Engineer",
        location: "Remote",
        location_type: "remote",
        contract_type: "full_time",
        start_date: "Jan 2024",
        end_date: null,
        description: "Did work.",
        tech_tags: ["React"],
        logo_url: null,
        company_url: null,
        sort_order: 0,
        show_in_resume: true,
        created_at: "",
        updated_at: "",
      },
    ],
    getSkills: async () => [],
    getProjects: async () => [],
    ...overrides,
  };
}

describe("filterExperienceForResume", () => {
  it("includes rows with show_in_resume true or undefined", () => {
    const rows = [
      { company: "A", show_in_resume: true },
      { company: "B" },
      { company: "C", show_in_resume: false },
    ];
    expect(filterExperienceForResume(rows).map((r) => r.company)).toEqual(["A", "B"]);
  });
});

describe("filterProjectsForResume", () => {
  it("includes only rows with show_in_resume true", () => {
    const rows = [
      { title: "A", show_in_resume: true },
      { title: "B" },
      { title: "C", show_in_resume: false },
    ];
    expect(filterProjectsForResume(rows).map((r) => r.title)).toEqual(["A"]);
  });
});

describe("getResumeData", () => {
  it("excludes experiences with show_in_resume false", async () => {
    const repo = emptyProjectsRepo({
      getExperience: async () => [
        {
          id: "1",
          company: "Visible Co",
          role: "Engineer",
          location: "Remote",
          location_type: "remote",
          contract_type: "full_time",
          start_date: "Jan 2024",
          end_date: null,
          description: "Did work.",
          tech_tags: ["React"],
          logo_url: null,
          company_url: null,
          sort_order: 0,
          show_in_resume: true,
          created_at: "",
          updated_at: "",
        },
        {
          id: "2",
          company: "Hidden Co",
          role: "Intern",
          location: "Remote",
          location_type: "remote",
          contract_type: "internship",
          start_date: "Jan 2020",
          end_date: "Dec 2020",
          description: "Internship.",
          tech_tags: ["JavaScript"],
          logo_url: null,
          company_url: null,
          sort_order: 1,
          show_in_resume: false,
          created_at: "",
          updated_at: "",
        },
      ],
    });

    const data = await getResumeData(repo);
    expect(data.experience).toHaveLength(1);
    expect(data.experience[0]!.company).toBe("Visible Co");
    expect(data.experience[0]!.sourceId).toBe("1");
    expect(data.experience[0]!.period).toBe("Jan 2024 - Present");
  });

  it("maps resume projects and skips hidden ones", async () => {
    const repo = emptyProjectsRepo({
      getProjects: async () => [
        {
          id: "p1",
          title: "GymOS",
          slug: "gymos",
          description: "Portfolio prose.",
          summary: "Summary.",
          cover_url: null,
          tech_tags: ["React"],
          role: "Founder",
          type: "web",
          github_url: null,
          live_url: null,
          playstore_url: null,
          appstore_url: null,
          is_featured: true,
          sort_order: 0,
          show_in_resume: true,
          resume_status: "In Progress",
          resume_description: "Multi-tenant coaching platform\nBuilt billing and roles",
          created_at: "",
          updated_at: "",
        },
        {
          id: "p2",
          title: "Hidden App",
          slug: "hidden-app",
          description: "Hidden.",
          summary: "Hidden.",
          cover_url: null,
          tech_tags: ["Go"],
          role: "Author",
          type: "other",
          github_url: null,
          live_url: null,
          playstore_url: null,
          appstore_url: null,
          is_featured: false,
          sort_order: 1,
          show_in_resume: false,
          resume_status: null,
          resume_description: "Should not appear",
          created_at: "",
          updated_at: "",
        },
      ],
    });

    const data = await getResumeData(repo);
    expect(data.projects).toEqual([
      {
        name: "GymOS",
        status: "In Progress",
        bullets: ["Multi-tenant coaching platform", "Built billing and roles"],
      },
    ]);
  });

  it("returns an empty projects array when none are opted in", async () => {
    const data = await getResumeData(emptyProjectsRepo());
    expect(data.projects).toEqual([]);
    expect(data.languages).toEqual([{ name: "English", level: "Fluent" }]);
    expect(data.remoteWorkLine).toBe("Remote-first.");
    expect(data.referencesLine).toBe("References available on request");
  });
});

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
  it("resolves immutable experience ids before legacy positional ids", () => {
    const result = applyTailoredResume(
      {
        ...base,
        experience: base.experience.map((experience, index) => ({
          ...experience,
          sourceId: `source-${index + 1}`,
        })),
      },
      {
        summary: "Tailored summary.",
        keywords: ["React"],
        titleOverride: null,
        experiences: [
          {
            experienceId: "source-2",
            bullets: [{ text: "Rewritten immutable source bullet." }],
          },
        ],
        skills: [{ category: "Frontend", items: ["React"] }],
      },
    );

    expect(result.experience.map((experience) => experience.company)).toEqual([
      "Beta Co",
    ]);
  });

  it("includes only tailored experiences in recency order", () => {
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
    expect(result.experience[0]!.company).toBe("Alpha Co");
    expect(result.experience[1]!.company).toBe("Beta Co");
    expect(result.experience[1]!.bullets[0]).toBe("Rewritten beta bullet.");
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

  it("enforces recency-weighted limits after AI tailoring", () => {
    const repeatedBullets = (prefix: string) =>
      Array.from({ length: 5 }, (_, index) => ({ text: `${prefix} ${index + 1}` }));
    const result = applyTailoredResume(
      base,
      {
        summary: "Tailored summary.",
        keywords: [],
        experiences: [
          { experienceId: "e3", bullets: repeatedBullets("Gamma") },
          { experienceId: "e2", bullets: repeatedBullets("Beta") },
          { experienceId: "e1", bullets: repeatedBullets("Alpha") },
        ],
        skills: [],
      },
      { maxRoles: 2, maxBullets: 5 },
    );

    expect(result.experience.map((item) => item.company)).toEqual([
      "Alpha Co",
      "Beta Co",
    ]);
    expect(result.experience.map((item) => item.bullets.length)).toEqual([5, 4]);
  });
});

describe("getValidatedHighlightedSkills", () => {
  it("returns canonical exact matches and discards unknown AI values", () => {
    expect(
      getValidatedHighlightedSkills(base, [
        " react ",
        "TYPESCRIPT",
        "Invented Framework",
        "React",
      ]),
    ).toEqual(["React", "TypeScript"]);
  });
});
