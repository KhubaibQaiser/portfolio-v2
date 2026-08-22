import {
  bulletBudgetForRole,
  sortDatedExperiencesByRecency,
} from "@portfolio/shared/experience-bullet-budget";
import { SKILL_CATEGORIES } from "@portfolio/shared/constants";
import type { VariantGuidelines } from "@portfolio/shared/schemas";
import type { ResumeLayoutComponentKey } from "@portfolio/shared/schemas/resume-layout";

import type { CandidateFacts } from "../context/build-candidate-facts";
import { tailoredResumeSchema, type TailoredResume } from "../schemas/tailored-resume";
import { isAtsResumeLayout, lintAtsResumeContent } from "./ats-resume-content-rules";

export type ResumeGenerationPolicy = {
  requireSummary: boolean;
  minRoles: number;
  maxRoles: number;
  maxBulletsPerRole: number;
  includeKeywordEmphasis: boolean;
  includeSkillHighlighting: boolean;
  maxPageCount: number;
};

export class ResumePolicyError extends Error {
  constructor(readonly violations: string[]) {
    super("Generated resume does not satisfy the selected layout policy");
    this.name = "ResumePolicyError";
  }
}

export function buildResumeGenerationPolicy(
  guidelines: VariantGuidelines,
): ResumeGenerationPolicy {
  return {
    requireSummary: guidelines.validation.requireSummary && guidelines.sections.summary,
    minRoles: guidelines.validation.minExperienceItems,
    maxRoles: guidelines.validation.maxExperienceItems,
    maxBulletsPerRole: Math.min(
      guidelines.validation.maxBulletsPerRole,
      guidelines.formatting.layout.maxBulletsPerJob,
    ),
    includeKeywordEmphasis:
      guidelines.contentEmphasis.experienceStrategy.highlightKeywords,
    includeSkillHighlighting:
      guidelines.formatting.layout.includeTagHighlighting &&
      guidelines.contentEmphasis.skillsStrategy.highlightRequired,
    maxPageCount: guidelines.validation.maxPageCount,
  };
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function stripBoldMarkers(value: string): string {
  return value.replace(/\*\*/g, "");
}

function numericClaims(value: string): string[] {
  return value.match(/[$€£]?\d[\d,.]*(?:%|x|k|m|b)?/gi) ?? [];
}

const COMMON_CAPITALIZED_WORDS = new Set([
  "Built",
  "Created",
  "Delivered",
  "Designed",
  "Developed",
  "Drove",
  "Improved",
  "Implemented",
  "Led",
  "Managed",
  "Optimized",
  "Reduced",
  "Scaled",
  "Shipped",
]);

function untraceableProperNouns(value: string, factText: string): string[] {
  return [...value.matchAll(/\b[A-Z][A-Za-z0-9.+#-]{2,}\b/g)].flatMap((match) => {
    const token = match[0];
    const prefix = value.slice(0, match.index);
    const startsSentence = match.index === 0 || /[.!?]\s*$/.test(prefix);
    return !startsSentence &&
      !COMMON_CAPITALIZED_WORDS.has(token) &&
      !factText.includes(token.toLocaleLowerCase())
      ? [token]
      : [];
  });
}

export function enforceResumeGenerationPolicy(
  candidate: unknown,
  facts: CandidateFacts,
  guidelines: VariantGuidelines,
  options?: { layoutComponentKey?: ResumeLayoutComponentKey },
): { resume: TailoredResume; warnings: string[] } {
  const resume = tailoredResumeSchema.parse(candidate);
  const policy = buildResumeGenerationPolicy(guidelines);
  const isAts = isAtsResumeLayout(options?.layoutComponentKey);
  const violations: string[] = [];
  const warnings: string[] = [];
  const canonicalFactText = facts.factSheet.toLocaleLowerCase();

  const minRoles = isAts ? facts.experienceTimeline.length : policy.minRoles;
  const maxRoles = isAts
    ? Math.max(policy.maxRoles, facts.experienceTimeline.length)
    : policy.maxRoles;

  if (isAts) {
    const bulletTexts = resume.experiences.flatMap((exp) =>
      exp.bullets.map((b) => b.text),
    );
    const atsLint = lintAtsResumeContent(
      resume.summary,
      bulletTexts,
      resume.titleOverride,
    );
    violations.push(...atsLint.violations);
  }

  if (policy.requireSummary && !resume.summary.trim()) {
    violations.push("summary is required");
  }
  if (!/[.!?]["')\]]?$/.test(resume.summary.trim())) {
    violations.push("summary must end with a complete sentence");
  }

  const timeline = new Map(
    facts.experienceTimeline.map((experience) => [experience.experienceId, experience]),
  );
  const seenExperienceIds = new Set<string>();
  const selected = resume.experiences.flatMap((experience) => {
    const source = facts.idMap.experiences[experience.experienceId];
    const dates = timeline.get(experience.experienceId);
    if (!source || !dates) {
      violations.push(`unknown experienceId ${experience.experienceId}`);
      return [];
    }
    if (seenExperienceIds.has(experience.experienceId)) {
      violations.push(`duplicate experienceId ${experience.experienceId}`);
      return [];
    }
    seenExperienceIds.add(experience.experienceId);

    const seenIndexes = new Set<number>();
    const roleSourceNumbers = new Set(
      source.bullets.flatMap(numericClaims).map(normalize),
    );
    for (const bullet of experience.bullets) {
      if (bullet.experienceId !== experience.experienceId) {
        violations.push(`mismatched bullet experienceId ${bullet.experienceId}`);
      }
      if (
        bullet.sourceBulletIndex < 0 ||
        bullet.sourceBulletIndex >= source.bullets.length
      ) {
        violations.push(
          `${experience.experienceId} has invalid sourceBulletIndex ${bullet.sourceBulletIndex}`,
        );
      }
      if (seenIndexes.has(bullet.sourceBulletIndex)) {
        violations.push(
          `${experience.experienceId} repeats sourceBulletIndex ${bullet.sourceBulletIndex}`,
        );
      }
      seenIndexes.add(bullet.sourceBulletIndex);

      const sourceBullet = source.bullets[bullet.sourceBulletIndex];
      if (sourceBullet) {
        const inventedNumbers = numericClaims(bullet.text).filter(
          (claim) => !roleSourceNumbers.has(normalize(claim)),
        );
        if (inventedNumbers.length > 0) {
          violations.push(
            `${experience.experienceId} adds unsupported numeric claims: ${inventedNumbers.join(", ")}`,
          );
        }
        const inventedNames = untraceableProperNouns(bullet.text, canonicalFactText);
        if (inventedNames.length > 0) {
          violations.push(
            `${experience.experienceId} adds unsupported named entities: ${inventedNames.join(", ")}`,
          );
        }
      }
    }

    return [{ ...experience, ...dates }];
  });

  const chronological = sortDatedExperiencesByRecency(selected);
  const limited = isAts ? chronological : chronological.slice(0, maxRoles);
  if (!isAts && selected.length > maxRoles) {
    warnings.push(`Limited experience to ${maxRoles} roles for this layout.`);
  }
  if (limited.length < minRoles) {
    violations.push(`at least ${minRoles} experience roles are required`);
  }

  const experiences = limited.map((experience, index) => {
    const budget = bulletBudgetForRole({
      index,
      maxBullets: policy.maxBulletsPerRole,
      startDate: experience.startDate,
      endDate: experience.endDate,
    });
    if (experience.bullets.length > budget) {
      warnings.push(
        `Limited ${experience.experienceId} to ${budget} bullets for this layout.`,
      );
    }
    return {
      experienceId: experience.experienceId,
      bullets: experience.bullets.slice(0, budget).map((bullet) => ({
        ...bullet,
        text: policy.includeKeywordEmphasis ? bullet.text : stripBoldMarkers(bullet.text),
      })),
    };
  });

  const returnedSkills = new Set<string>();
  const canonicalGroups = new Map<string, string[]>();
  for (const group of resume.skills) {
    for (const item of group.items) {
      const canonical = facts.idMap.skills[normalize(item)];
      if (!canonical) {
        violations.push(`unknown skill ${item}`);
        continue;
      }
      if (returnedSkills.has(normalize(canonical.name))) continue;
      returnedSkills.add(normalize(canonical.name));
      const category =
        SKILL_CATEGORIES[canonical.category as keyof typeof SKILL_CATEGORIES] ??
        canonical.category;
      const items = canonicalGroups.get(category) ?? [];
      items.push(canonical.name);
      canonicalGroups.set(category, items);
    }
  }
  const skills = [...canonicalGroups].map(([category, items]) => ({
    category,
    items,
  }));

  const highlightedSkills = policy.includeSkillHighlighting
    ? [...new Set(resume.highlightedSkills.map(normalize))].flatMap((skill) => {
        const canonical = facts.idMap.skills[skill];
        if (!canonical || !returnedSkills.has(skill)) {
          violations.push(
            `highlighted skill is not in returned canonical skills: ${skill}`,
          );
          return [];
        }
        return [canonical.name];
      })
    : [];

  const keywordSet = new Set<string>();
  let keywords = resume.keywords.flatMap((keyword) => {
    const trimmed = keyword.trim();
    const key = normalize(trimmed);
    if (!key || keywordSet.has(key)) return [];
    if (!canonicalFactText.includes(key)) {
      warnings.push(`Removed untraceable keyword: ${trimmed}`);
      return [];
    }
    keywordSet.add(key);
    return [trimmed];
  });
  if (keywords.length === 0) {
    keywords = [...returnedSkills]
      .map((skill) => facts.idMap.skills[skill]?.name)
      .filter((skill): skill is string => Boolean(skill))
      .slice(0, 10);
    warnings.push("Rebuilt empty keywords from validated canonical skills.");
  }

  if (violations.length > 0) throw new ResumePolicyError(violations);

  return {
    resume: tailoredResumeSchema.parse({
      ...resume,
      summary: policy.includeKeywordEmphasis
        ? resume.summary
        : stripBoldMarkers(resume.summary),
      experiences,
      skills,
      highlightedSkills,
      keywords,
    }),
    warnings,
  };
}
