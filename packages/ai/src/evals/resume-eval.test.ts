import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { classicGuidelines, modernBlueGuidelines } from "@portfolio/shared/schemas";
import type { BuildCandidateFactsInput } from "../context/build-candidate-facts";
import { buildCandidateFacts } from "../context/build-candidate-facts";
import {
  enforceResumeGenerationPolicy,
  ResumePolicyError,
} from "../policy/resume-generation-policy";
import { validateFabrication } from "../guardrails/fabrication-check";

const CASES_DIR = path.join(import.meta.dirname, "cases");
const GUIDELINES = {
  classic: classicGuidelines,
  "modern-blue": modernBlueGuidelines,
} as const;

type EvalCase = {
  id: string;
  description: string;
  guidelines: keyof typeof GUIDELINES;
  modelOutput: unknown;
  expect: "pass" | "fail";
  expectViolationIncludes?: string;
  factsInput?: BuildCandidateFactsInput;
};

const sharedFacts = JSON.parse(
  readFileSync(path.join(CASES_DIR, "_candidate.json"), "utf8"),
) as BuildCandidateFactsInput;

const files = readdirSync(CASES_DIR).filter(
  (file) =>
    file.endsWith(".json") && !file.startsWith("_") && file !== "jailbreak-attempts.json",
);

describe("resume-ai eval suite (offline — see specs/resume-ai.md)", () => {
  for (const file of files) {
    const c = JSON.parse(readFileSync(path.join(CASES_DIR, file), "utf8")) as EvalCase;
    it(`${c.id}: ${c.description}`, () => {
      const facts = buildCandidateFacts(c.factsInput ?? sharedFacts);
      const guidelines = GUIDELINES[c.guidelines]();
      const run = () => {
        const { resume } = enforceResumeGenerationPolicy(c.modelOutput, facts, guidelines);
        const fab = validateFabrication(resume, facts.idMap);
        if (!fab.ok) throw new ResumePolicyError(fab.offending);
      };
      if (c.expect === "pass") {
        expect(run).not.toThrow();
        return;
      }
      try {
        run();
        throw new Error(`expected ${c.id} to fail but it passed`);
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("expected ")) throw error;
        if (c.expectViolationIncludes) {
          const msg =
            error instanceof ResumePolicyError ? error.violations.join(", ") : String(error);
          expect(msg).toContain(c.expectViolationIncludes);
        } else {
          expect(error).toBeInstanceOf(ResumePolicyError);
        }
      }
    });
  }
});
