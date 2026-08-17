import { describe, expect, it } from "vitest";
import { buildCoverLetterSystemPrompt, coverLetterAddressing } from "./cover-letter";
import { COVER_LETTER_PLACEHOLDERS } from "./shared";
import type { CandidateFacts } from "../context/build-candidate-facts";

const facts = { factSheet: "CANDIDATE FACTS", idMap: {} } as CandidateFacts;

describe("coverLetterAddressing", () => {
  it("uses curly-brace placeholders when fields are empty", () => {
    expect(coverLetterAddressing({})).toEqual({
      company: COVER_LETTER_PLACEHOLDERS.company,
      role: COVER_LETTER_PLACEHOLDERS.role,
      hiringManager: COVER_LETTER_PLACEHOLDERS.hiringManager,
    });
  });

  it("uses provided values when present", () => {
    expect(
      coverLetterAddressing({
        company: "Acme",
        role: "Staff Engineer",
        hiringManager: "Alex Jordan",
      }),
    ).toEqual({
      company: "Acme",
      role: "Staff Engineer",
      hiringManager: "Alex Jordan",
    });
  });
});

describe("buildCoverLetterSystemPrompt", () => {
  it("hardcodes C1 English, short length, and placeholder greeting", () => {
    const prompt = buildCoverLetterSystemPrompt(facts);
    expect(prompt).toContain("C1");
    expect(prompt).toContain("strong, confident, and convincing");
    expect(prompt).toContain("{Hiring Manager}");
    expect(prompt).toContain("{Company}");
    expect(prompt).toContain("{Role Title}");
    expect(prompt).toContain("1 or 2 short paragraphs");
    expect(prompt).not.toContain("Tone: friendly");
  });

  it("injects real company, role, and hiring manager when provided", () => {
    const prompt = buildCoverLetterSystemPrompt(facts, {
      company: "Acme",
      role: "Staff Engineer",
      hiringManager: "Alex Jordan",
    });
    expect(prompt).toContain("Company: Acme");
    expect(prompt).toContain("Role title: Staff Engineer");
    expect(prompt).toContain("Hiring manager: Alex Jordan");
    expect(prompt).toContain("Dear Alex Jordan,");
    expect(prompt).not.toContain("Dear {Hiring Manager},");
  });
});
