import { SKILL_CATEGORIES, getSkillCategorySortWeight } from "./constants";
import type { ContentRepository } from "./ports/content-repository";
import { getContractTypeLabel, filterExperienceForResume } from "./schemas/experience";

/** The read slice of {@link ContentRepository} the resume loader needs. */
export type ResumeContentSource = Pick<
  ContentRepository,
  "getSiteConfig" | "getResume" | "getExperience" | "getSkills"
>;

export type ResumeSocialLink = {
  platform: string;
  url: string;
  label: string;
};

export type ResumeDataExperience = {
  company: string;
  role: string;
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
  education: ResumeDataEducation[];
  certifications: { name: string; issuer: string }[];
  skills: ResumeDataSkillGroup[];
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
  const [siteConfig, resume, experience, skills] = await Promise.all([
    repo.getSiteConfig(),
    repo.getResume(),
    repo.getExperience(),
    repo.getSkills(),
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
    "education",
    "certifications",
    "skills",
  ];

  const title = opts.titleOverride?.trim() || siteConfig.title;

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
      company: exp.company,
      role: exp.role,
      period: `${exp.start_date} – ${exp.end_date ?? "Present"}`,
      location: formatExpLocation(exp.location, exp.location_type),
      contractType: getContractTypeLabel(exp.contract_type),
      bullets: exp.description.split("\n").filter(Boolean),
      tech: exp.tech_tags.join(", "),
    })),
    education,
    certifications: certifications.map((c) => ({
      name: c.name,
      issuer: c.issuer ?? "",
    })),
    skills: skillGroups,
  };
}

/** Stable id → index in canonical experience list (e1 → 0, e2 → 1, …). */
export function stableExperienceIndex(stableId: string): number | null {
  const match = /^e(\d+)$/.exec(stableId.trim());
  if (!match) return null;
  const index = parseInt(match[1]!, 10) - 1;
  return index >= 0 ? index : null;
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
): ResumeData {
  const experience = tailored.experiences
    .map((te) => {
      const index = stableExperienceIndex(te.experienceId);
      if (index === null || index >= base.experience.length) return null;
      const exp = base.experience[index]!;
      return {
        ...exp,
        bullets: te.bullets.map((b) => b.text),
      };
    })
    .filter((exp): exp is ResumeDataExperience => exp !== null);

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
