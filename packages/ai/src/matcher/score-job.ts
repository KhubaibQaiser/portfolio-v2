import { stripPromptInjection } from "../guardrails/prompt-injection";
import { trimJobDescription } from "../context/trim-job-description";
import { canonicalSkill } from "./synonyms";
import { bandForScore, type JobBand } from "@portfolio/shared/schemas/job-posting";
import type { JobPreferencesFormData } from "@portfolio/shared/schemas/job-preferences";

export type MatcherJobInput = {
  title: string;
  location: string;
  remote: boolean;
  salaryMin: number | null;
  jdHtmlOrText: string;
};

export type MatcherFacts = {
  skillNames: string[];
  factSheet: string;
};

export type MatchResult = {
  score: number;
  band: JobBand;
  gaps: string[];
  filtered: boolean;
};

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function prepareJobText(raw: string): string {
  return trimJobDescription(stripPromptInjection(stripHtml(raw)));
}

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9+]+/)
      .filter((token) => token.length > 2),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const item of a) {
    if (b.has(item)) inter += 1;
  }
  return inter / (a.size + b.size - inter);
}

function titleMatchesFamily(title: string, families: string[]): boolean {
  if (families.length === 0) return true;
  const hay = title.toLowerCase();
  return families.some((family) => {
    const tokens = family.toLowerCase().split(/\s+/).filter(Boolean);
    return tokens.every((token) => hay.includes(token));
  });
}

function seniorityOk(title: string, bands: string[]): boolean {
  if (bands.length === 0) return true;
  const hay = title.toLowerCase();
  const hasAnyBandWord = [
    "junior",
    "intern",
    "associate",
    "mid",
    "senior",
    "staff",
    "principal",
    "director",
    "head of",
  ].some((word) => hay.includes(word));
  if (!hasAnyBandWord) return true;
  return bands.some((band) => hay.includes(band.toLowerCase()));
}

function arrangementOk(remote: boolean, prefs: JobPreferencesFormData): boolean {
  if (prefs.work_arrangements.includes("remote") && remote) return true;
  if (prefs.work_arrangements.includes("hybrid") && !remote) return true;
  if (prefs.work_arrangements.includes("onsite") && !remote) return true;
  if (prefs.work_arrangements.includes("hybrid") && remote) return true;
  return prefs.work_arrangements.includes("remote") && remote;
}

function locationOk(location: string, prefs: JobPreferencesFormData): boolean {
  const hay = location.toLowerCase();
  if (prefs.location_deny.some((deny) => hay.includes(deny.toLowerCase()))) {
    return false;
  }
  if (prefs.location_allow.length === 0) return true;
  return prefs.location_allow.some((allow) => hay.includes(allow.toLowerCase()));
}

function excludeOk(title: string, jd: string, prefs: JobPreferencesFormData): boolean {
  const hay = `${title} ${jd}`.toLowerCase();
  return !prefs.keyword_exclude.some((word) => hay.includes(word.toLowerCase()));
}

function visaOk(jd: string, prefs: JobPreferencesFormData): boolean {
  if (prefs.visa_relocation !== "required") return true;
  const hay = jd.toLowerCase();
  return (
    hay.includes("visa") || hay.includes("sponsorship") || hay.includes("relocation")
  );
}

/**
 * White-box discovery score. Filtered jobs return score 0 and must not persist.
 */
export function scoreJob(
  job: MatcherJobInput,
  prefs: JobPreferencesFormData,
  facts: MatcherFacts,
): MatchResult {
  const jd = prepareJobText(job.jdHtmlOrText);
  const gaps: string[] = [];

  if (!titleMatchesFamily(job.title, prefs.title_families)) {
    return { score: 0, band: "filtered", gaps: ["title family"], filtered: true };
  }
  if (!seniorityOk(job.title, prefs.seniority_bands)) {
    return { score: 0, band: "filtered", gaps: ["seniority"], filtered: true };
  }
  if (!arrangementOk(job.remote, prefs)) {
    return { score: 0, band: "filtered", gaps: ["work arrangement"], filtered: true };
  }
  if (!locationOk(job.location, prefs)) {
    return { score: 0, band: "filtered", gaps: ["location"], filtered: true };
  }
  if (
    prefs.salary_floor !== null &&
    job.salaryMin !== null &&
    job.salaryMin < prefs.salary_floor
  ) {
    return { score: 0, band: "filtered", gaps: ["salary floor"], filtered: true };
  }
  if (!excludeOk(job.title, jd, prefs)) {
    return { score: 0, band: "filtered", gaps: ["excluded keyword"], filtered: true };
  }
  if (!visaOk(jd, prefs)) {
    return { score: 0, band: "filtered", gaps: ["visa/relocation"], filtered: true };
  }

  const jobTokens = tokenize(`${job.title} ${jd}`);
  const jobSkills = new Set([...jobTokens].map((token) => canonicalSkill(token)));
  const profileSkills = [...new Set(facts.skillNames.map(canonicalSkill))].filter(
    (skill) => skill.length > 2,
  );
  const matchedSkillCount = profileSkills.filter((skill) => jobSkills.has(skill)).length;
  const coverage =
    profileSkills.length === 0 ? 0.5 : matchedSkillCount / profileSkills.length;

  const factTokens = tokenize(facts.factSheet);
  const lexical = jaccard(jobTokens, factTokens);

  if (prefs.keyword_include.length > 0) {
    const hay = `${job.title} ${jd}`.toLowerCase();
    const missing = prefs.keyword_include.filter(
      (word) => !hay.includes(word.toLowerCase()),
    );
    for (const word of missing) gaps.push(`missing keyword: ${word}`);
  }

  const missingSkills = profileSkills
    .filter((skill) => !jobSkills.has(skill))
    .slice(0, 5);
  for (const skill of missingSkills) gaps.push(`skill gap: ${skill}`);

  const includeBoost =
    prefs.keyword_include.length === 0
      ? 0
      : Math.round(
          (prefs.keyword_include.filter((word) =>
            `${job.title} ${jd}`.toLowerCase().includes(word.toLowerCase()),
          ).length /
            prefs.keyword_include.length) *
            10,
        );

  const score = Math.max(
    1,
    Math.min(100, Math.round(25 + coverage * 60 + lexical * 20 + includeBoost)),
  );

  return { score, band: bandForScore(score), gaps: gaps.slice(0, 12), filtered: false };
}
