import { describe, expect, it } from "vitest";
import type { Project } from "@portfolio/shared/schemas";
import { pickRelatedProjects } from "./related-projects";

function project(
  partial: Partial<Project> & Pick<Project, "id" | "type" | "tech_tags">,
): Project {
  return {
    title: partial.title ?? partial.id,
    slug: partial.slug ?? partial.id,
    description: "d",
    summary: "s",
    cover_url: null,
    role: "Engineer",
    github_url: null,
    live_url: null,
    playstore_url: null,
    appstore_url: null,
    is_featured: false,
    sort_order: partial.sort_order ?? 0,
    show_in_resume: false,
    resume_status: null,
    resume_description: "",
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    revision: 1,
    ...partial,
  };
}

describe("pickRelatedProjects", () => {
  it("prefers the same type and overlapping tags, excluding self", () => {
    const current = project({
      id: "a",
      type: "web",
      tech_tags: ["React", "AWS"],
    });
    const related = pickRelatedProjects(current, [
      current,
      project({ id: "b", type: "web", tech_tags: ["Vue"], sort_order: 2 }),
      project({ id: "c", type: "mobile", tech_tags: ["React"], sort_order: 1 }),
      project({ id: "d", type: "web", tech_tags: ["React", "AWS"], sort_order: 3 }),
      project({ id: "e", type: "game", tech_tags: ["Unity"], sort_order: 0 }),
    ]);
    expect(related.map((p) => p.id)).toEqual(["d", "b", "c"]);
  });
});
