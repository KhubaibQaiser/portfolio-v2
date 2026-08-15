import { describe, expect, it } from "vitest";
import { classicGuidelines } from "@portfolio/shared/schemas";
import { buildCandidateFacts } from "@portfolio/ai/context/build-candidate-facts";

import { createGenerationSnapshot } from "./generation-snapshot";

function facts(description: string) {
  return buildCandidateFacts({
    siteConfig: {
      name: "Test User",
      title: "Engineer",
      email: "test@example.com",
      location: "Remote",
      social_links: [],
    },
    resume: {
      default_summary: "A complete source summary used only for snapshot tests.",
      education: [],
      certifications: [],
    },
    experiences: [
      {
        id: "immutable-id",
        company: "Source Co",
        role: "Engineer",
        location: "Remote",
        location_type: "remote",
        contract_type: "full_time",
        start_date: "Jan 2024",
        end_date: null,
        description,
        tech_tags: ["React"],
      },
    ],
    skills: [{ category: "frontend", name: "React" }],
  });
}

describe("createGenerationSnapshot", () => {
  it("is deterministic and changes when source bullets change", () => {
    const first = createGenerationSnapshot(
      facts("Built React products."),
      classicGuidelines(),
      1,
    );
    const same = createGenerationSnapshot(
      facts("Built React products."),
      classicGuidelines(),
      1,
    );
    const changed = createGenerationSnapshot(
      facts("Built different React products."),
      classicGuidelines(),
      1,
    );

    expect(first).toEqual(same);
    expect(changed.sourceHash).not.toBe(first.sourceHash);
    expect(first.experience[0]?.id).toBe("immutable-id");
  });
});
