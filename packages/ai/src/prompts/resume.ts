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
  const header = `You are a senior resume strategist tailoring an existing candidate profile to a specific Job Description. Your job is to REWRITE, not invent, so the resulting resume is ATS-friendly and sounds unmistakably human. Target a 2-page PDF: concise, impact-first, no filler.`;

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
- summary: 2-3 sentences, max 450 characters. Lead with years + core stack + best metric. No AI-tooling mention unless the JD asks for it.
- titleOverride: optional JD-aligned title when truthful (Senior/Staff/Full-Stack). Omit if default title fits.
- experiences: include ONLY roles relevant to the JD, max 5 total, ordered by JD relevance. Drop oldest or least relevant roles entirely.
- Bullet budget by relevance (top = most JD-relevant after reordering):
  - Top 2 roles: up to 4 bullets each, max ~22 words per bullet.
  - Next 2 roles: 2-3 bullets each.
  - 5th role (if included): 1-2 bullets max.
- Roles before 2019 (e.g. early mobile/edtech): omit unless the JD explicitly needs that domain. If included, max 1 bullet each.
- Part-time or concurrent roles: max 2 bullets; frame as consulting when appropriate.
- Weave 1-2 stack terms into each bullet inline. Do NOT add a separate Technologies footer.
- skills: max 6 categories, max 8 items per category. JD-relevant categories first. Use standard ATS labels (Frontend, Backend / API, Cloud / AWS / GCP, etc.).
- keywords: max 25 atomic ATS terms (technologies, methodologies). No marketing phrases.`,
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
