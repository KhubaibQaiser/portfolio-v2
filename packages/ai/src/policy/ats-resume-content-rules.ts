import type { ResumeLayoutComponentKey } from "@portfolio/shared/schemas";

export const ATS_RESUME_ALLOWED_HYPHENS = [
  "quaid-i-azam",
  "content-to-commerce",
] as const;

export const ATS_RESUME_ALLOWED_TITLES = [
  "Senior Software Engineer",
  "Senior Fullstack Engineer",
] as const;

export const ATS_RESUME_SECTION_HEADERS = [
  "Professional Summary",
  "Technical Skills",
  "Professional Experience",
  "Education",
  "Languages",
  "Personal Projects",
] as const;

const BANNED_UNICODE = /[\u2013\u2014\u2018\u2019\u201c\u201d]/g;

const HYPHENATED_COMPOUND = /\b[a-z]+-[a-z]+(?:-[a-z]+)*\b/gi;

export function isAtsResumeLayout(componentKey?: ResumeLayoutComponentKey): boolean {
  return componentKey === "ats-resume";
}

export function scanBannedUnicode(text: string): string[] {
  return [...new Set(text.match(BANNED_UNICODE) ?? [])];
}

export function scanHyphenatedCompounds(text: string): string[] {
  const matches = text.match(HYPHENATED_COMPOUND) ?? [];
  return matches.filter((match) => {
    const lower = match.toLowerCase();
    return !ATS_RESUME_ALLOWED_HYPHENS.some((allowed) => lower.includes(allowed));
  });
}

export function isAllowedAtsTitle(title: string | null | undefined): boolean {
  if (title === null || title === undefined || title.trim() === "") return true;
  return ATS_RESUME_ALLOWED_TITLES.includes(
    title.trim() as (typeof ATS_RESUME_ALLOWED_TITLES)[number],
  );
}

export type AtsResumeContentLintResult = {
  violations: string[];
};

export function lintAtsResumeContent(
  summary: string,
  bullets: string[],
  titleOverride: string | null | undefined,
): AtsResumeContentLintResult {
  const violations: string[] = [];

  if (!isAllowedAtsTitle(titleOverride)) {
    violations.push(
      `titleOverride must be one of: ${ATS_RESUME_ALLOWED_TITLES.join(", ")}`,
    );
  }

  const allText = [summary, ...bullets];
  for (const text of allText) {
    const banned = scanBannedUnicode(text);
    if (banned.length > 0) {
      violations.push(`banned Unicode in text: ${banned.join(", ")}`);
    }
    const hyphens = scanHyphenatedCompounds(text);
    if (hyphens.length > 0) {
      violations.push(`hyphenated compounds in text: ${hyphens.join(", ")}`);
    }
    if (text.includes("**")) {
      violations.push("markdown bold is not allowed in ATS resume content");
    }
  }

  return { violations };
}
