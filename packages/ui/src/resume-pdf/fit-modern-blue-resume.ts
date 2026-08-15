import type { ResumeData } from "@portfolio/shared/resume-data";
import type { VariantGuidelines } from "@portfolio/shared/schemas";
import {
  allocateRecencyBulletBudgets,
  bulletFloorForRole,
  sortDatedExperiencesByRecency,
} from "@portfolio/shared/experience-bullet-budget";
import type { ModernBlueDensity } from "./modern-blue-print-spec";
import type { ResumePdfMode } from "./resume-render-options";

const MAX_SKILL_GROUPS = 8;
const MAX_SKILLS_PER_GROUP = 14;
const SUMMARY_HARD_LIMIT = 560;
const BULLET_HARD_LIMIT = 320;

export type FitReport = {
  mode: ResumePdfMode;
  density: ModernBlueDensity;
  pageCount: number;
  candidateRoles: number;
  retainedRoles: number;
  acceptedBulletCounts: number[];
  fallbackSteps: string[];
  roleDropReason: string | null;
  renderAttempts: number;
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
  projectedBulletBudgets: number[];
};

export function createFitReport(mode: ResumePdfMode = "canonical"): FitReport {
  return {
    mode,
    density: "reference",
    pageCount: 0,
    candidateRoles: 0,
    retainedRoles: 0,
    acceptedBulletCounts: [],
    fallbackSteps: [],
    roleDropReason: null,
    renderAttempts: 0,
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
  options: {
    mode?: ResumePdfMode;
    minimumBullets?: boolean;
  } = {},
): ModernBlueProjection {
  const report = createFitReport(options.mode);
  const maxBullets = Math.min(
    guidelines.validation.maxBulletsPerRole,
    guidelines.formatting.layout.maxBulletsPerJob,
  );
  const sortedExperience = sortDatedExperiencesByRecency(source.experience);
  const allocatedExperience = allocateRecencyBulletBudgets(sortedExperience, maxBullets);
  const projectedBulletBudgets = allocatedExperience.budgets;
  const experience = allocatedExperience.experiences.map((item, index) => ({
    ...item,
    bullets: options.minimumBullets
      ? item.bullets.slice(0, bulletFloorForRole(index, maxBullets))
      : item.bullets,
  }));
  report.candidateRoles = sortedExperience.length;
  report.retainedRoles = experience.length;
  report.acceptedBulletCounts = experience.map((item) => item.bullets.length);
  report.droppedBullets = sortedExperience.reduce(
    (total, item, index) =>
      total + Math.max(0, item.bullets.length - experience[index]!.bullets.length),
    0,
  );

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
    projectedBulletBudgets,
  };
}

export function cloneModernBlueProjection(
  projection: ModernBlueProjection,
): ModernBlueProjection {
  return {
    data: {
      ...projection.data,
      experience: projection.data.experience.map((experience) => ({
        ...experience,
        bullets: [...experience.bullets],
      })),
      skills: projection.data.skills.map((group) => ({
        ...group,
        items: [...group.items],
      })),
      projects: projection.data.projects.map((project) => ({
        ...project,
        bullets: [...project.bullets],
      })),
      education: [...projection.data.education],
      certifications: [...projection.data.certifications],
      languages: [...projection.data.languages],
      socialLinks: [...projection.data.socialLinks],
      visibleSections: [...projection.data.visibleSections],
    },
    report: {
      ...projection.report,
      acceptedBulletCounts: [...projection.report.acceptedBulletCounts],
      fallbackSteps: [...projection.report.fallbackSteps],
      droppedSections: [...projection.report.droppedSections],
    },
    projectedBulletBudgets: [...projection.projectedBulletBudgets],
  };
}

export function syncModernBlueFitReport(
  projection: ModernBlueProjection,
  source: ResumeData,
): void {
  projection.report.retainedRoles = projection.data.experience.length;
  projection.report.acceptedBulletCounts = projection.data.experience.map(
    (experience) => experience.bullets.length,
  );
  projection.report.droppedRoles = Math.max(
    0,
    projection.report.candidateRoles - projection.report.retainedRoles,
  );
  projection.report.droppedBullets = Math.max(
    0,
    source.experience.reduce(
      (total, experience) => total + experience.bullets.length,
      0,
    ) -
      projection.data.experience.reduce(
        (total, experience) => total + experience.bullets.length,
        0,
      ),
  );
  projection.report.droppedSkillGroups = Math.max(
    0,
    source.skills.length - projection.data.skills.length,
  );
  projection.report.droppedSkills = Math.max(
    0,
    source.skills.reduce((total, group) => total + group.items.length, 0) -
      projection.data.skills.reduce((total, group) => total + group.items.length, 0),
  );
}

export function removeLeastRelevantBullet(projection: ModernBlueProjection): boolean {
  const lastIndex = projection.data.experience.length - 1;
  const trimFromOldest = (minimumForIndex: (index: number) => number): boolean => {
    for (let index = lastIndex; index >= 0; index -= 1) {
      const experience = projection.data.experience[index]!;
      if (experience.bullets.length <= minimumForIndex(index)) continue;
      experience.bullets = experience.bullets.slice(0, -1);
      projection.report.droppedBullets += 1;
      return true;
    }
    return false;
  };

  if (trimFromOldest((index) => (index >= 3 ? 1 : Number.MAX_SAFE_INTEGER))) {
    return true;
  }
  if (
    trimFromOldest((index) => (index >= 1 && index <= 2 ? 2 : Number.MAX_SAFE_INTEGER))
  ) {
    return true;
  }
  if (
    trimFromOldest((index) => (index >= 1 && index <= 2 ? 1 : Number.MAX_SAFE_INTEGER))
  ) {
    return true;
  }

  const newestFloor = Math.max(2, (projection.projectedBulletBudgets[0] ?? 1) - 1);
  const experience = projection.data.experience[0];
  if (experience && experience.bullets.length > newestFloor) {
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
  projection.projectedBulletBudgets = projection.projectedBulletBudgets.slice(0, -1);
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
