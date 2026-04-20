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

export type ResumePromptOptions = {
  tone?: Tone;
  length?: Length;
  language?: Language;
  company?: string;
  role?: string;
  mustTryToInclude?: string[];
  retryReason?: string;
};

export function buildResumeSystemPrompt(
  facts: CandidateFacts,
  opts: ResumePromptOptions = {},
): string {
  const header = `You are a senior resume strategist tailoring an existing candidate profile to a specific Job Description. Your job is to REWRITE, not invent, so the resulting resume is ATS-friendly and sounds unmistakably human.`;

  const roleLine = opts.role
    ? `Target role: ${opts.role}${opts.company ? ` at ${opts.company}` : ""}.`
    : "";

  const include = opts.mustTryToInclude?.length
    ? `\nTry to naturally include these keywords where truthful: ${opts.mustTryToInclude.join(", ")}.`
    : "";

  const retry = opts.retryReason
    ? `\nPREVIOUS ATTEMPT WAS REJECTED: ${opts.retryReason}\nFix the violations in this attempt.`
    : "";

  return [
    header,
    roleLine,
    describeOptions(opts),
    PROMPT_INJECTION_RULES,
    ANTI_FABRICATION_RULES,
    ANTI_ROBOTIC_RULES,
    `OUTPUT SHAPE:
- Return JSON matching the provided schema exactly.
- summary: a 2-4 sentence professional summary anchored in the candidate's real work.
- experiences: one entry per relevant experience from the fact sheet. You may reorder by JD relevance, drop irrelevant roles entirely, or keep them all.
- For each experience, produce 3-6 bullets. Each bullet MUST include {experienceId, sourceBulletIndex} pointing to a real source bullet. Max ~28 words per bullet.
- skills: regroup/reorder so JD-relevant categories come first. You may rename categories for clarity (e.g. "Frontend" → "Frontend & UX").
- keywords: short list (≤ 30) of ATS-relevant keywords your rewrite truthfully covers.`,
    `CANDIDATE FACT SHEET:\n${facts.factSheet}`,
    include,
    retry,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildResumeUserPrompt(wrappedJd: string): string {
  return `Tailor the candidate's resume to the following Job Description. Follow every constraint above. Return only the JSON object.\n\n${wrappedJd}`;
}
