import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_JOB_PREFERENCES } from "@portfolio/shared/schemas/job-preferences";
import { scoreJob, type MatcherJobInput } from "../matcher/score-job";

const CASES_DIR = path.join(import.meta.dirname, "cases/job-match");

type EvalCase = {
  id: string;
  description: string;
  expect: "pass" | "fail";
  job: MatcherJobInput;
};

const facts = {
  skillNames: ["TypeScript", "React", "AWS", "PostgreSQL"],
  factSheet: "Staff engineer TypeScript React AWS DynamoDB Next.js.",
};

describe("job-match eval suite (offline — see specs/job-match.md)", () => {
  const files = readdirSync(CASES_DIR).filter((file) => file.endsWith(".json"));
  for (const file of files) {
    const c = JSON.parse(readFileSync(path.join(CASES_DIR, file), "utf8")) as EvalCase;
    it(`${c.id}: ${c.description}`, () => {
      const result = scoreJob(c.job, DEFAULT_JOB_PREFERENCES, facts);
      if (c.expect === "fail") {
        expect(result.filtered).toBe(true);
        return;
      }
      expect(result.filtered).toBe(false);
      expect(result.score).toBeGreaterThan(0);
    });
  }
});
