import type { CandidateFacts } from "../context/build-candidate-facts";
import {
  ANTI_FABRICATION_RULES,
  ANTI_ROBOTIC_RULES,
  COVER_LETTER_PLACEHOLDERS,
  PROMPT_INJECTION_RULES,
  RESUME_AI_VOICE_RULES,
  fieldOrPlaceholder,
} from "./shared";

export type CoverLetterPromptOptions = {
  company?: string;
  role?: string;
  hiringManager?: string;
  retryReason?: string;
};

export function coverLetterAddressing(opts: CoverLetterPromptOptions): {
  company: string;
  role: string;
  hiringManager: string;
} {
  return {
    company: fieldOrPlaceholder(opts.company, COVER_LETTER_PLACEHOLDERS.company),
    role: fieldOrPlaceholder(opts.role, COVER_LETTER_PLACEHOLDERS.role),
    hiringManager: fieldOrPlaceholder(
      opts.hiringManager,
      COVER_LETTER_PLACEHOLDERS.hiringManager,
    ),
  };
}

export function buildCoverLetterSystemPrompt(
  facts: CandidateFacts,
  opts: CoverLetterPromptOptions = {},
): string {
  const header = `You are the candidate writing a cover letter in first person. The result must read like a thoughtful human wrote it, not a template.`;
  const addressing = coverLetterAddressing(opts);

  const retry = opts.retryReason
    ? `\nPREVIOUS ATTEMPT WAS REJECTED: ${opts.retryReason}\nFix the violations in this attempt.`
    : "";

  return [
    header,
    RESUME_AI_VOICE_RULES,
    `ADDRESSING (copy placeholders verbatim when they appear in curly braces. Do not invent names):
- Company: ${addressing.company}
- Role title: ${addressing.role}
- Hiring manager: ${addressing.hiringManager}`,
    PROMPT_INJECTION_RULES,
    ANTI_FABRICATION_RULES,
    ANTI_ROBOTIC_RULES,
    `OUTPUT SHAPE:
- Return JSON matching the provided schema exactly.
- greeting: "Dear ${addressing.hiringManager}," exactly when the hiring manager value contains curly braces. Otherwise "Dear <name>,".
- body: 1-2 short paragraphs. Open with a specific hook tied to ${addressing.role} at ${addressing.company}, not self-description.
  Use the company and role values above, including placeholders, wherever those names belong.
  One paragraph MUST reference 1-2 concrete achievements from the candidate's real experience (paraphrased, never invented).
- closing: one or two sentences, forward-looking, no boilerplate "I look forward to hearing from you".
- signOff: "Best regards,\\n<Name>".

STYLE CHECKLIST BEFORE RETURNING:
- First sentence is not a self-description.
- No banned words (see VOICE CONSTRAINTS).
- No triples.
- No em dashes (U+2014), semicolons, ellipses, or exclamation marks.
- Periods and commas only, plus apostrophes.
- Each paragraph has at least one sentence < 12 words and one sentence > 18 words.`,
    `CANDIDATE FACT SHEET:\n${facts.factSheet}`,
    retry,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildCoverLetterUserPrompt(wrappedJd: string): string {
  return `Write the cover letter addressing the following Job Description. Follow every constraint above. Return only the JSON object.\n\n${wrappedJd}`;
}
