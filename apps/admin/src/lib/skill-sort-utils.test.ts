import { describe, expect, it } from "vitest";
import type { Skill } from "@portfolio/shared/schemas";
import {
  getCategoryDisplayOrder,
  insertNewSkill,
  moveSkillToCategory,
  normalizeSkillsOrder,
  removeSkillAndReindex,
  reorderSkillInCategory,
} from "./skill-sort-utils";

function skill(
  id: string,
  name: string,
  category: Skill["category"],
  sort_order: number,
): Skill {
  return {
    id,
    name,
    category,
    sort_order,
    proficiency: 80,
    icon: null,
    years: 3,
    created_at: "",
    updated_at: "",
    revision: 1,
  };
}

describe("getCategoryDisplayOrder", () => {
  it("orders by category weight then label", () => {
    const order = getCategoryDisplayOrder(["cloud", "frontend", "testing", "backend"]);
    expect(order).toEqual(["frontend", "backend", "cloud", "testing"]);
  });
});

describe("normalizeSkillsOrder", () => {
  it("reindexes sort_order contiguously per category", () => {
    const input = [
      skill("1", "Lambda", "cloud", 5),
      skill("2", "CDK", "cloud", 0),
      skill("3", "React", "frontend", 2),
      skill("4", "Next", "frontend", 0),
    ];
    const result = normalizeSkillsOrder(input);

    const cloud = result.filter((s) => s.category === "cloud");
    expect(cloud.map((s) => s.name)).toEqual(["CDK", "Lambda"]);
    expect(cloud.map((s) => s.sort_order)).toEqual([0, 1]);

    const frontend = result.filter((s) => s.category === "frontend");
    expect(frontend.map((s) => s.name)).toEqual(["Next", "React"]);
    expect(frontend.map((s) => s.sort_order)).toEqual([0, 1]);
  });

  it("flattens categories by display weight", () => {
    const input = [
      skill("1", "Docker", "devops", 0),
      skill("2", "React", "frontend", 0),
      skill("3", "Node", "backend", 0),
    ];
    const result = normalizeSkillsOrder(input);
    expect(result.map((s) => s.category)).toEqual(["frontend", "backend", "devops"]);
  });
});

describe("reorderSkillInCategory", () => {
  it("reorders only within the target category", () => {
    const input = [
      skill("a", "Lambda", "cloud", 0),
      skill("b", "CDK", "cloud", 1),
      skill("c", "Node", "backend", 0),
    ];
    const result = reorderSkillInCategory(input, "cloud", "b", "a");

    const cloud = result.filter((s) => s.category === "cloud");
    expect(cloud.map((s) => s.name)).toEqual(["CDK", "Lambda"]);
    expect(cloud.map((s) => s.sort_order)).toEqual([0, 1]);

    const backend = result.filter((s) => s.category === "backend");
    expect(backend.map((s) => s.name)).toEqual(["Node"]);
    expect(backend[0]!.sort_order).toBe(0);
  });
});

describe("moveSkillToCategory", () => {
  it("appends skill to end of new category and reindexes both", () => {
    const input = [
      skill("a", "Lambda", "cloud", 0),
      skill("b", "CDK", "cloud", 1),
      skill("c", "Node", "backend", 0),
      skill("d", "GraphQL", "backend", 1),
    ];
    const result = moveSkillToCategory(input, "a", "backend");

    const cloud = result.filter((s) => s.category === "cloud");
    expect(cloud.map((s) => s.name)).toEqual(["CDK"]);
    expect(cloud[0]!.sort_order).toBe(0);

    const backend = result.filter((s) => s.category === "backend");
    expect(backend.map((s) => s.name)).toEqual(["Node", "GraphQL", "Lambda"]);
    expect(backend.map((s) => s.sort_order)).toEqual([0, 1, 2]);
  });
});

describe("removeSkillAndReindex", () => {
  it("removes skill and compacts sort_order in category", () => {
    const input = [
      skill("a", "Lambda", "cloud", 0),
      skill("b", "CDK", "cloud", 1),
      skill("c", "DynamoDB", "cloud", 2),
    ];
    const result = removeSkillAndReindex(input, "b");

    expect(result.map((s) => s.name)).toEqual(["Lambda", "DynamoDB"]);
    expect(result.map((s) => s.sort_order)).toEqual([0, 1]);
  });
});

describe("insertNewSkill", () => {
  it("places new skill at end of its category", () => {
    const input = [skill("a", "Lambda", "cloud", 0)];
    const draft = skill("new-1", "CDK", "cloud", 99);
    const result = insertNewSkill(input, draft);

    expect(result.map((s) => s.name)).toEqual(["Lambda", "CDK"]);
    expect(result.map((s) => s.sort_order)).toEqual([0, 1]);
  });
});
