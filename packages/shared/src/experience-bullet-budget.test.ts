import { describe, expect, it } from "vitest";
import {
  allocateRecencyBulletBudgets,
  bulletBudgetForRole,
  sortDatedExperiencesByRecency,
} from "./experience-bullet-budget";

const NOW = new Date("2026-08-15T00:00:00.000Z");

describe("experience bullet budgets", () => {
  it("tapers bullets by recency", () => {
    expect(
      bulletBudgetForRole({
        index: 0,
        maxBullets: 5,
        startDate: "Aug 2024",
        endDate: null,
        now: NOW,
      }),
    ).toBe(5);
    expect(
      bulletBudgetForRole({
        index: 2,
        maxBullets: 5,
        startDate: "Jan 2023",
        endDate: "Aug 2024",
        now: NOW,
      }),
    ).toBe(3);
  });

  it("caps roles at least five years old at two bullets", () => {
    expect(
      bulletBudgetForRole({
        index: 0,
        maxBullets: 5,
        startDate: "Jan 2019",
        endDate: "Aug 2020",
        now: NOW,
      }),
    ).toBe(2);
    expect(
      bulletBudgetForRole({
        index: 1,
        maxBullets: 5,
        startDate: "Aug 2019",
        endDate: null,
        now: NOW,
      }),
    ).toBe(2);
  });

  it("sorts, allocates, and reports dropped bullets without mutating input", () => {
    const source = [
      {
        id: "older",
        startDate: "Jan 2020",
        endDate: "Jan 2021",
        bullets: ["1", "2", "3"],
      },
      {
        id: "recent",
        startDate: "Aug 2024",
        endDate: null,
        bullets: ["1", "2", "3", "4", "5", "6"],
      },
    ];

    const result = allocateRecencyBulletBudgets(source, 5, NOW);

    expect(result.experiences.map((item) => item.id)).toEqual(["recent", "older"]);
    expect(result.experiences.map((item) => item.bullets.length)).toEqual([5, 2]);
    expect(result.budgets).toEqual([5, 2]);
    expect(result.droppedBullets).toBe(2);
    expect(source.map((item) => item.bullets.length)).toEqual([3, 6]);
  });

  it("uses start date to order concurrent roles", () => {
    const sorted = sortDatedExperiencesByRecency([
      { id: "older", startDate: "Jan 2023", endDate: null },
      { id: "newer", startDate: "Jan 2025", endDate: null },
    ]);
    expect(sorted.map((item) => item.id)).toEqual(["newer", "older"]);
  });
});
