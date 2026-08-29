import { describe, expect, it } from "vitest";
import { DEFAULT_JOB_PREFERENCES } from "@portfolio/shared/schemas/job-preferences";
import { scoreJob } from "./score-job";

const facts = {
  skillNames: ["TypeScript", "React", "AWS", "PostgreSQL"],
  factSheet: "Staff engineer TypeScript React AWS DynamoDB Next.js portfolio.",
};

describe("scoreJob", () => {
  it("filters titles outside the configured families", () => {
    const result = scoreJob(
      {
        title: "Junior Marketing Intern",
        location: "Remote",
        remote: true,
        salaryMin: null,
        jdHtmlOrText: "Unpaid internship in marketing.",
      },
      DEFAULT_JOB_PREFERENCES,
      facts,
    );
    expect(result.filtered).toBe(true);
    expect(result.score).toBe(0);
  });

  it("scores a matching staff engineering role above the notify floor", () => {
    const result = scoreJob(
      {
        title: "Staff Software Engineer",
        location: "Remote",
        remote: true,
        salaryMin: 180000,
        jdHtmlOrText:
          "Staff software engineer TypeScript React AWS PostgreSQL Next.js DynamoDB.",
      },
      DEFAULT_JOB_PREFERENCES,
      facts,
    );
    expect(result.filtered).toBe(false);
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.band).not.toBe("filtered");
  });
});
