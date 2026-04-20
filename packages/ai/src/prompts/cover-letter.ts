import type { CandidateFacts } from "../context/build-candidate-facts";
import {
  ANTI_FABRICATION_RULES,
  ANTI_ROBOTIC_RULES,
  PROMPT_INJECTION_RULES,
  describeOptions,
  type Language,
  type Length,
  type Tone,
} from "./shared";

export type CoverLetterPromptOptions = {
  tone?: Tone;
  length?: Length;
  language?: Language;
  company?: string;
  role?: string;
  hiringManager?: string;
  retryReason?: string;
};

export function buildCoverLetterSystemPrompt(
  facts: CandidateFacts,
  opts: CoverLetterPromptOptions = {},
): string {
  const header = `You are the candidate writing a cover letter in first person. The result must read like a thoughtful human wrote it, not a template.`;

  const metaLines: string[] = [];
  if (opts.company) metaLines.push(`Company: ${opts.company}`);
  if (opts.role) metaLines.push(`Role: ${opts.role}`);
  if (opts.hiringManager)
    metaLines.push(`Hiring manager: ${opts.hiringManager}`);
  const metaBlock = metaLines.length ? metaLines.join("\n") : "";

  const retry = opts.retryReason
    ? `\nPREVIOUS ATTEMPT WAS REJECTED: ${opts.retryReason}\nFix the violations in this attempt.`
    : "";

  return [
    header,
    metaBlock,
    describeOptions(opts),
    PROMPT_INJECTION_RULES,
    ANTI_FABRICATION_RULES,
    ANTI_ROBOTIC_RULES,
    `OUTPUT SHAPE:
- Return JSON matching the provided schema exactly.
- greeting: match language convention. Use the hiring manager's name only if provided.
- body: 2-4 paragraphs. Open with a specific hook tied to the role or company, not self-description.
  Middle paragraph(s) MUST reference 1-2 concrete achievements from the candidate's real experience (paraphrased, never invented).
  Penultimate paragraph can address one JD-specific requirement with evidence from the fact sheet.
- closing: brief, forward-looking, no boilerplate "I look forward to hearing from you".
- signOff: "Best regards,\\n<Name>" or language-equivalent.

STYLE CHECKLIST BEFORE RETURNING:
- First sentence is not a self-description.
- No banned words (see VOICE CONSTRAINTS).
- No triples.
- No em dashes (U+2014) and no semicolons in any field.
- Each paragraph has at least one sentence < 12 words and one sentence > 18 words.
- Spelling convention matches the JD.`,
    `CANDIDATE FACT SHEET:\n${facts.factSheet}`,
    retry,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildCoverLetterUserPrompt(wrappedJd: string): string {
  return `Write the cover letter addressing the following Job Description. Follow every constraint above. Return only the JSON object.\n\n${wrappedJd}`;
}
