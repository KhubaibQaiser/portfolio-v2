import { SKILL_CATEGORIES, getSkillCategorySortWeight } from "./constants";
import {
  allocateRecencyBulletBudgets,
  sortDatedExperiencesByRecency,
} from "./experience-bullet-budget";
import type { ContentRepository } from "./ports/content-repository";
import { getContractTypeLabel, filterExperienceForResume } from "./schemas/experience";
import { filterProjectsForResume } from "./schemas/project";

/** The read slice of {@link ContentRepository} the resume loader needs. */
export type ResumeContentSource = Pick<
  ContentRepository,
  "getSiteConfig" | "getResume" | "getExperience" | "getSkills" | "getProjects"
>;

export type ResumeSocialLink = {
  platform: string;
  url: string;
  label: string;
};

export type ResumeDataExperience = {
  /** Immutable CMS/DB identifier. Legacy fixtures may omit it. */
  sourceId?: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string | null;
  period: string;
  location: string;
  contractType: string;
  bullets: string[];
  tech: string;
};

export type ResumeDataEducation = {
  degree: string;
  institution: string;
  year: string;
};

export type ResumeDataSkillGroup = {
  category: string;
  items: string[];
};

export type ResumeDataProject = {
  name: string;
  status?: string;
  bullets: string[];
};

export type ResumeDataLanguage = {
  name: string;
  level: string;
};

export type ResumeData = {
  name: string;
  title: string;
  email: string;
  phone?: string;
  location: string;
  website: string;
  socialLinks: ResumeSocialLink[];
  summary: string;
  keywords: string;
  visibleSections: string[];
  experience: ResumeDataExperience[];
  projects: ResumeDataProject[];
  education: ResumeDataEducation[];
  certifications: { name: string; issuer: string }[];
  skills: ResumeDataSkillGroup[];
  languages: ResumeDataLanguage[];
  remoteWorkLine: string | null;
  referencesLine: string | null;
};

export type GetResumeDataOptions = {
  /** Override the website host shown on the PDF (e.g. strip protocol). */
  websiteHost?: string;
  /** Override the summary (used by variants). */
  summaryOverride?: string | null;
  /** Override the title shown on the PDF header. */
  titleOverride?: string | null;
  /** Max skill items rendered per category on the PDF (default 10). */
  maxSkillItemsPerCategory?: number;
};

const DEFAULT_MAX_SKILL_ITEMS = 10;

/** Compact location for PDF: "San Francisco, CA · Remote" */
export function formatExpLocation(city: string, locationType: string): string {
  const typeLabel = locationType.charAt(0).toUpperCase() + locationType.slice(1);
  return `${city} · ${typeLabel}`;
}

/**
 * Shared loader used by the web PDF route and the admin Resume AI page.
 * Accepts a content repository so the calling app controls both the backend
 * and caching (`unstable_cache` on the web, a plain call on the admin).
 */
export async function getResumeData(
  repo: ResumeContentSource,
  opts: GetResumeDataOptions = {},
): Promise<ResumeData> {
  const [siteConfig, resume, experience, skills, projects] = await Promise.all([
    repo.getSiteConfig(),
    repo.getResume(),
    repo.getExperience(),
    repo.getSkills(),
    repo.getProjects(),
  ]);

  const socialLinks = (siteConfig.social_links as unknown as ResumeSocialLink[]) ?? [];
  const phoneEntry = socialLinks.find((l) => l.platform === "phone");

  const education = (resume.education as unknown as ResumeDataEducation[]) ?? [];

  const certifications =
    (resume.certifications as unknown as Array<{
      name: string;
      issuer: string;
    }>) ?? [];

  const maxSkillItems = opts.maxSkillItemsPerCategory ?? DEFAULT_MAX_SKILL_ITEMS;

  const grouped = skills.reduce<Record<string, { items: string[]; weight: number }>>(
    (acc, s) => {
      const label =
        SKILL_CATEGORIES[s.category as keyof typeof SKILL_CATEGORIES] ?? s.category;
      if (!acc[label]) {
        acc[label] = {
          items: [],
          weight: getSkillCategorySortWeight(s.category),
        };
      }
      acc[label]!.items.push(s.name);
      return acc;
    },
    {},
  );

  const skillGroups: ResumeDataSkillGroup[] = Object.entries(grouped)
    .sort(([, a], [, b]) => b.weight - a.weight)
    .map(([category, { items }]) => ({
      category,
      items: items.slice(0, maxSkillItems),
    }));

  const allSkillNames = skillGroups.flatMap((g) => g.items);
  const keywords = [siteConfig.title, ...allSkillNames.slice(0, 30)].join(", ");

  const visibleSections = (resume.visible_sections as unknown as string[]) ?? [
    "experience",
    "projects",
    "education",
    "certifications",
    "skills",
  ];

  const title = opts.titleOverride?.trim() || siteConfig.title;

  const resumeProjects: ResumeDataProject[] = filterProjectsForResume(projects).map(
    (project) => {
      const status = project.resume_status?.trim();
      return {
        name: project.title,
        ...(status ? { status } : {}),
        bullets: project.resume_description.split("\n").filter(Boolean),
      };
    },
  );

  return {
    name: siteConfig.name,
    title,
    email: siteConfig.email,
    phone: phoneEntry?.url,
    location: siteConfig.location,
    website: opts.websiteHost ?? "khubaibqaiser.com",
    socialLinks,
    summary: opts.summaryOverride ?? resume.default_summary,
    keywords,
    visibleSections,
    experience: filterExperienceForResume(experience).map((exp) => ({
      sourceId: exp.id,
      company: exp.company,
      role: exp.role,
      startDate: exp.start_date,
      endDate: exp.end_date,
      period: `${exp.start_date} - ${exp.end_date ?? "Present"}`,
      location: formatExpLocation(exp.location, exp.location_type),
      contractType: getContractTypeLabel(exp.contract_type),
      bullets: exp.description.split("\n").filter(Boolean),
      tech: exp.tech_tags.join(", "),
    })),
    projects: resumeProjects,
    education,
    certifications: certifications.map((c) => ({
      name: c.name,
      issuer: c.issuer ?? "",
    })),
    skills: skillGroups,
    languages: (resume.languages ?? []).map((lang) => ({
      name: lang.name,
      level: lang.level,
    })),
    remoteWorkLine: resume.remote_work_line?.trim() || null,
    referencesLine: resume.references_line?.trim() || null,
  };
}

/** Stable id → index in canonical experience list (e1 → 0, e2 → 1, …). */
export function stableExperienceIndex(stableId: string): number | null {
  const match = /^e(\d+)$/.exec(stableId.trim());
  if (!match) return null;
  const index = parseInt(match[1]!, 10) - 1;
  return index >= 0 ? index : null;
}

export function resolveExperienceIndex(
  experienceId: string,
  experiences: readonly ResumeDataExperience[],
): number | null {
  const immutableIndex = experiences.findIndex(
    (experience) => experience.sourceId === experienceId,
  );
  if (immutableIndex >= 0) return immutableIndex;

  const legacyIndex = stableExperienceIndex(experienceId);
  return legacyIndex !== null && legacyIndex < experiences.length ? legacyIndex : null;
}

function normalizeSkillName(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function getValidatedHighlightedSkills(
  base: ResumeData,
  requestedSkills: readonly string[],
): string[] {
  const canonicalSkills = new Map(
    base.skills.flatMap((group) =>
      group.items.map((skill) => [normalizeSkillName(skill), skill] as const),
    ),
  );
  const highlighted = new Set<string>();
  for (const requestedSkill of requestedSkills) {
    const canonical = canonicalSkills.get(normalizeSkillName(requestedSkill));
    if (canonical) highlighted.add(canonical);
  }
  return [...highlighted];
}

/**
 * Merge tailored AI output into canonical ResumeData for PDF export.
 * Only experiences present in the tailored payload are included, in AI order.
 */
export function applyTailoredResume(
  base: ResumeData,
  tailored: {
    summary: string;
    keywords: string[];
    experiences: Array<{ experienceId: string; bullets: Array<{ text: string }> }>;
    skills: Array<{ category: string; items: string[] }>;
    titleOverride?: string | null;
  },
  limits?: {
    maxRoles: number;
    maxBullets: number;
  },
): ResumeData {
  const selectedExperience = tailored.experiences
    .map((tailoredExperience) => {
      const index = resolveExperienceIndex(
        tailoredExperience.experienceId,
        base.experience,
      );
      if (index === null || index >= base.experience.length) return null;
      const exp = base.experience[index]!;
      return {
        ...exp,
        bullets: tailoredExperience.bullets.map((bullet) => bullet.text),
      };
    })
    .filter((exp): exp is ResumeDataExperience => exp !== null);
  const sortedExperience = sortDatedExperiencesByRecency(selectedExperience);
  const limitedExperience = limits
    ? sortedExperience.slice(0, limits.maxRoles)
    : sortedExperience;
  const experience = limits
    ? allocateRecencyBulletBudgets(limitedExperience, limits.maxBullets).experiences
    : limitedExperience;

  const tailoredSkills =
    tailored.skills.length > 0
      ? tailored.skills.map((g) => ({
          category: g.category,
          items: g.items,
        }))
      : base.skills;

  const keywords =
    tailored.keywords.length > 0 ? tailored.keywords.join(", ") : base.keywords;

  const title = tailored.titleOverride?.trim() || base.title;

  return {
    ...base,
    title,
    summary: tailored.summary || base.summary,
    experience,
    skills: tailoredSkills,
    keywords,
  };
}
