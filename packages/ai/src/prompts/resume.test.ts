import { describe, expect, it } from "vitest";
import { classicGuidelines } from "@portfolio/shared/schemas";
import {
  buildResumeSystemPrompt,
  describeLayoutGuidelines,
  interpolateTailoringTemplate,
} from "./resume";
import type { CandidateFacts } from "../context/build-candidate-facts";

describe("interpolateTailoringTemplate", () => {
  it("substitutes placeholders without rewriting values that contain braces", () => {
    const result = interpolateTailoringTemplate(
      "JD:{jobDescription}\nDATA:{resumeData}",
      {
        jobDescription: "Need {resumeData} skills",
        resumeData: "React",
      },
    );
    expect(result).toBe("JD:Need {resumeData} skills\nDATA:React");
  });
});

describe("describeLayoutGuidelines", () => {
  it("requires a new summary when regenerateForJob is true", () => {
    const text = describeLayoutGuidelines(classicGuidelines());
    expect(text).toContain("ALWAYS write a new professional summary");
    expect(text).toContain("maximum 450 characters");
    expect(text).toContain("Maximum 280 characters per bullet");
    expect(text).not.toContain("sentences max");
    expect(text).toContain("**double asterisks**");
  });
});

describe("buildResumeSystemPrompt", () => {
  it("keeps output-shape defaults and appends layout guidelines", () => {
    const facts = {
      factSheet: "CANDIDATE FACTS",
      idMap: {},
    } as CandidateFacts;
    const prompt = buildResumeSystemPrompt(facts, {}, classicGuidelines());
    expect(prompt).toContain("OUTPUT SHAPE");
    expect(prompt).toContain("LAYOUT GUIDELINES");
    expect(prompt).toContain("CANDIDATE FACTS");
    expect(prompt).toContain("MUST NOT invent");
  });
});
