import { describe, expect, it } from "vitest";
import {
  buildCandidateFacts,
  type BuildCandidateFactsInput,
} from "./build-candidate-facts";

const baseInput: BuildCandidateFactsInput = {
  siteConfig: {
    name: "Test User",
    title: "Engineer",
    email: "test@example.com",
    location: "Remote",
    social_links: [],
  },
  resume: {
    default_summary: "A sufficiently detailed base summary for prompt context.",
    education: [],
    certifications: [],
  },
  experiences: [
    {
      id: "older",
      company: "Older Co",
      role: "Engineer",
      location: "Remote",
      location_type: "remote",
      contract_type: "full_time",
      start_date: "Jan 2020",
      end_date: "Jan 2022",
      description: "Built older systems.",
      tech_tags: ["TypeScript"],
    },
    {
      id: "recent",
      company: "Recent Co",
      role: "Senior Engineer",
      location: "Remote",
      location_type: "remote",
      contract_type: "full_time",
      start_date: "Jan 2024",
      end_date: null,
      description: "Built recent systems.",
      tech_tags: ["React"],
    },
  ],
  skills: [],
};

describe("buildCandidateFacts", () => {
  it("keeps immutable source ids after sorting experience by recency", () => {
    const facts = buildCandidateFacts(baseInput);

    expect(facts.factSheet.indexOf("[recent] Senior Engineer")).toBeLessThan(
      facts.factSheet.indexOf("[older] Engineer"),
    );
    expect(facts.idMap.experiences.recent?.legacyId).toBe("e1");
    expect(facts.experienceTimeline).toEqual([
      { experienceId: "recent", startDate: "Jan 2024", endDate: null },
      { experienceId: "older", startDate: "Jan 2020", endDate: "Jan 2022" },
    ]);
  });
});
