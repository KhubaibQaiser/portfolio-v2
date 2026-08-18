import type { Project } from "@portfolio/shared/schemas";

const RELATED_LIMIT = 3;

function tagOverlap(a: string[], b: string[]): number {
  const other = new Set(b.map((t) => t.toLowerCase()));
  return a.filter((t) => other.has(t.toLowerCase())).length;
}

/** Up to 3 related case studies: same type first, then overlapping tech tags. */
export function pickRelatedProjects(current: Project, all: Project[]): Project[] {
  const candidates = all.filter((p) => p.id !== current.id);
  const scored = candidates.map((project) => {
    const typeScore = project.type === current.type ? 2 : 0;
    const tagScore = tagOverlap(current.tech_tags, project.tech_tags);
    return { project, score: typeScore + tagScore };
  });
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.project.sort_order - b.project.sort_order;
  });
  return scored
    .filter((row) => row.score > 0)
    .slice(0, RELATED_LIMIT)
    .map((row) => row.project);
}
