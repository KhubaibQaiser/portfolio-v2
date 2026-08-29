import type { CandidateFacts } from "../context/build-candidate-facts";
import {
  ANTI_FABRICATION_RULES,
  ANTI_ROBOTIC_RULES,
  COVER_LETTER_PLACEHOLDERS,
  PROMPT_INJECTION_RULES,
  RESUME_AI_VOICE_RULES,
  fieldOrPlaceholder,
} from "./shared";

export type RecruiterMessagePromptOptions = {
  company?: string;
  role?: string;
};

export function buildRecruiterMessageSystemPrompt(
  facts: CandidateFacts,
  opts: RecruiterMessagePromptOptions = {},
): string {
  const company = fieldOrPlaceholder(opts.company, COVER_LETTER_PLACEHOLDERS.company);
  const role = fieldOrPlaceholder(opts.role, COVER_LETTER_PLACEHOLDERS.role);

  return [
    "You are the candidate writing a short recruiter note. It is copied by a human; never auto-sent.",
    RESUME_AI_VOICE_RULES,
    `ADDRESSING (copy placeholders verbatim when they appear in curly braces):
- Company: ${company}
- Role title: ${role}`,
    PROMPT_INJECTION_RULES,
    ANTI_FABRICATION_RULES,
    ANTI_ROBOTIC_RULES,
    `OUTPUT SHAPE:
- Return JSON matching the schema.
- subject: 4-120 characters. Name the role and company, including placeholders when present.
- body: 500-800 characters. First person. One specific achievement from the fact sheet. No invented metrics, employers, or skills.
- Never offer to apply on the reader's behalf. Never include a URL you were not given.`,
    `CANDIDATE FACT SHEET:\n${facts.factSheet}`,
  ].join("\n\n");
}

export function buildRecruiterMessageUserPrompt(wrappedJd: string): string {
  return `Write the recruiter note for this Job Description. Return only the JSON object.\n\n${wrappedJd}`;
}
