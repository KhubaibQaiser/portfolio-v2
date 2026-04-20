import { PROMPT_INJECTION_RULES } from "./shared";
import type { TailoredResume } from "../schemas/tailored-resume";

export function buildAtsSystemPrompt(): string {
  return [
    `You are an ATS scoring assistant. Given a tailored resume and a Job Description, produce an ATS match score (0-100), matched and missing keywords, and 3-6 concrete suggestions.`,
    PROMPT_INJECTION_RULES,
    `OUTPUT FORMAT:
- Respond with a single JSON object only (no markdown code fences, no commentary before or after).
- Keys must be exactly: "score" (integer 0-100), "matchedKeywords" (string array), "missingKeywords" (string array), "suggestions" (string array).`,
    `RULES:
- Keywords must be short, atomic terms (technologies, methodologies, named tools). Not generic words ("experience", "team"). Each keyword is at most 6 words. Never use full JD marketing sentences or clauses as a single keyword (e.g. do not output "state-of-the-art Live App stack" as one token—split into Elixir, Phoenix, LiveView, etc., or omit if not an extractable skill).
- EQUIVALENT TERMS (critical): Before listing anything in missingKeywords, verify it is not already satisfied under a common variant. Treat as the SAME skill or tool if the resume clearly refers to it using a different but standard spelling: different casing (TypeScript vs typescript), spacing or punctuation (Tailwind CSS vs tailwindcss vs tailwind css), hyphens vs none (Next.js vs Nextjs), abbreviations vs full names when one is standard (K8s vs Kubernetes when context matches), or product names that differ only by suffix (e.g. library vs framework wording for the same stack). Do NOT flag the JD term as missing when the resume already demonstrates that capability under an alternate label. Never put the same concept in both matchedKeywords and missingKeywords (e.g. if Tailwind CSS is matched, do not list tailwindcss as missing).
- "Matched" = the JD demands the concept and the resume substantively covers it (exact wording or accepted equivalent per above).
- "Missing" = the JD emphasizes a requirement and the resume does not show it, even after checking for equivalents. Prefer concrete, testable gaps only. One row per distinct gap.
- Suggestions should be actionable rewrites that the candidate could apply without fabricating. If a gap cannot be truthfully filled, suggest "consider emphasizing X" rather than "add Y". Do not suggest stuffing verbatim JD slogans.
- Score rubric: 90+ excellent fit, 75-89 strong, 60-74 moderate, <60 weak.`,
  ].join("\n\n");
}

/**
 * Compact, token-lean rendering of the tailored resume used as the
 * ATS input. Skips candidate facts entirely (~3K tokens saved).
 */
export function renderResumeForAts(resume: TailoredResume): string {
  const bullets = resume.experiences
    .flatMap((e) => e.bullets.map((b) => `- ${b.text}`))
    .join("\n");
  const skills = resume.skills
    .map((g) => `${g.category}: ${g.items.join(", ")}`)
    .join("\n");
  return [
    `SUMMARY:\n${resume.summary}`,
    `KEYWORDS: ${resume.keywords.join(", ")}`,
    `BULLETS:\n${bullets}`,
    `SKILLS:\n${skills}`,
  ].join("\n\n");
}

export function buildAtsUserPrompt(
  resume: TailoredResume,
  wrappedJd: string,
): string {
  return `Compare the tailored resume below against the Job Description. Return only the JSON object.\n\n<resume>\n${renderResumeForAts(resume)}\n</resume>\n\n${wrappedJd}`;
}
