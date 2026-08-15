import type { ResumeData } from "@portfolio/shared/resume-data";
import type { VariantGuidelines } from "@portfolio/shared/schemas";
import type { ModernBlueDensity } from "./modern-blue-print-spec";

const MAX_SKILL_GROUPS = 8;
const MAX_SKILLS_PER_GROUP = 14;
const SUMMARY_HARD_LIMIT = 560;
const BULLET_HARD_LIMIT = 320;

export type FitReport = {
  density: ModernBlueDensity;
  pageCount: number;
  droppedRoles: number;
  droppedBullets: number;
  droppedSkillGroups: number;
  droppedSkills: number;
  droppedSections: string[];
  clampedSummary: boolean;
  clampedBullets: number;
};

export type ModernBlueProjection = {
  data: ResumeData;
  report: FitReport;
};

export function createFitReport(): FitReport {
  return {
    density: "reference",
    pageCount: 0,
    droppedRoles: 0,
    droppedBullets: 0,
    droppedSkillGroups: 0,
    droppedSkills: 0,
    droppedSections: [],
    clampedSummary: false,
    clampedBullets: 0,
  };
}

function clampAtWord(value: string, maxCharacters: number): string {
  if (value.length <= maxCharacters) return value;
  const candidate = value.slice(0, maxCharacters + 1);
  const boundary = candidate.lastIndexOf(" ");
  return `${candidate.slice(0, boundary > maxCharacters * 0.75 ? boundary : maxCharacters).trim()}…`;
}

export function projectModernBlueResume(
  source: ResumeData,
  guidelines: VariantGuidelines,
): ModernBlueProjection {
  const report = createFitReport();
  const maxRoles = guidelines.validation.maxExperienceItems;
  const maxBullets = Math.min(
    guidelines.validation.maxBulletsPerRole,
    guidelines.formatting.layout.maxBulletsPerJob,
  );
  const experience = source.experience.slice(0, maxRoles).map((item) => {
    report.droppedBullets += Math.max(0, item.bullets.length - maxBullets);
    return { ...item, bullets: item.bullets.slice(0, maxBullets) };
  });
  report.droppedRoles = Math.max(0, source.experience.length - experience.length);

  const skills = source.skills.slice(0, MAX_SKILL_GROUPS).map((group) => {
    report.droppedSkills += Math.max(0, group.items.length - MAX_SKILLS_PER_GROUP);
    return { ...group, items: group.items.slice(0, MAX_SKILLS_PER_GROUP) };
  });
  report.droppedSkillGroups = Math.max(0, source.skills.length - skills.length);

  return {
    data: {
      ...source,
      experience,
      skills,
      projects: source.projects.map((project) => ({
        ...project,
        bullets: project.bullets.slice(0, 2),
      })),
    },
    report,
  };
}

export function removeLeastRelevantBullet(projection: ModernBlueProjection): boolean {
  for (let index = projection.data.experience.length - 1; index >= 0; index -= 1) {
    const experience = projection.data.experience[index]!;
    if (experience.bullets.length <= 1) continue;
    experience.bullets = experience.bullets.slice(0, -1);
    projection.report.droppedBullets += 1;
    return true;
  }
  return false;
}

export function removeLeastRelevantRole(
  projection: ModernBlueProjection,
  minimumRoles: number,
): boolean {
  if (projection.data.experience.length <= minimumRoles) return false;
  projection.data.experience = projection.data.experience.slice(0, -1);
  projection.report.droppedRoles += 1;
  return true;
}

export function removeLeastRelevantSkill(projection: ModernBlueProjection): boolean {
  for (let index = projection.data.skills.length - 1; index >= 0; index -= 1) {
    const group = projection.data.skills[index]!;
    if (group.items.length > 1) {
      group.items = group.items.slice(0, -1);
      projection.report.droppedSkills += 1;
      return true;
    }
  }
  if (projection.data.skills.length > 1) {
    projection.data.skills = projection.data.skills.slice(0, -1);
    projection.report.droppedSkillGroups += 1;
    return true;
  }
  return false;
}

export function removeLowestPriorityOptionalSection(
  projection: ModernBlueProjection,
): boolean {
  const candidates: Array<{
    key: string;
    hasContent: boolean;
    remove: () => void;
  }> = [
    {
      key: "projects",
      hasContent: projection.data.projects.length > 0,
      remove: () => {
        projection.data.projects = [];
      },
    },
    {
      key: "references",
      hasContent: Boolean(projection.data.referencesLine),
      remove: () => {
        projection.data.referencesLine = null;
      },
    },
    {
      key: "certifications",
      hasContent: projection.data.certifications.length > 0,
      remove: () => {
        projection.data.certifications = [];
      },
    },
    {
      key: "remote",
      hasContent: Boolean(projection.data.remoteWorkLine),
      remove: () => {
        projection.data.remoteWorkLine = null;
      },
    },
    {
      key: "languages",
      hasContent: projection.data.languages.length > 0,
      remove: () => {
        projection.data.languages = [];
      },
    },
  ];
  const candidate = candidates.find(
    (item) => item.hasContent && !projection.report.droppedSections.includes(item.key),
  );
  if (!candidate) return false;
  candidate.remove();
  projection.report.droppedSections.push(candidate.key);
  return true;
}

export function clampLongestModernBlueContent(projection: ModernBlueProjection): boolean {
  if (projection.data.summary.length > SUMMARY_HARD_LIMIT) {
    projection.data.summary = clampAtWord(projection.data.summary, SUMMARY_HARD_LIMIT);
    projection.report.clampedSummary = true;
    return true;
  }

  const candidates = projection.data.experience
    .flatMap((experience, experienceIndex) =>
      experience.bullets.map((bullet, bulletIndex) => ({
        experienceIndex,
        bulletIndex,
        length: bullet.length,
      })),
    )
    .filter((item) => item.length > BULLET_HARD_LIMIT)
    .sort((left, right) => right.length - left.length);
  const longest = candidates[0];
  if (!longest) return false;

  const experience = projection.data.experience[longest.experienceIndex]!;
  experience.bullets[longest.bulletIndex] = clampAtWord(
    experience.bullets[longest.bulletIndex]!,
    BULLET_HARD_LIMIT,
  );
  projection.report.clampedBullets += 1;
  return true;
}
