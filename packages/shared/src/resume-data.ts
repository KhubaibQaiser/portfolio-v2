import type { SupabaseClient } from "@supabase/supabase-js";
import { SKILL_CATEGORIES } from "./constants";
import { getContractTypeLabel } from "./schemas/experience";
import type { Database } from "./supabase/database.types";
import {
  getExperience,
  getResume,
  getSiteConfig,
  getSkills,
} from "./supabase/queries";

type Client = SupabaseClient<Database>;

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
};

/**
 * Shared loader used by the web PDF route and the admin Resume AI page.
 * Accepts a Supabase client so the calling app controls caching
 * (`unstable_cache` on the web, a plain call on the admin).
 */
export async function getResumeData(
  client: Client,
  opts: GetResumeDataOptions = {},
): Promise<ResumeData> {
  const [siteConfig, resume, experience, skills] = await Promise.all([
    getSiteConfig(client),
    getResume(client),
    getExperience(client),
    getSkills(client),
  ]);

  const socialLinks = (siteConfig.social_links as unknown as ResumeSocialLink[]) ?? [];
  const phoneEntry = socialLinks.find((l) => l.platform === "phone");

  const education =
    (resume.education as unknown as ResumeDataEducation[]) ?? [];

  const certifications =
    (resume.certifications as unknown as Array<{
      name: string;
      issuer: string;
    }>) ?? [];

  const grouped = skills.reduce<Record<string, string[]>>((acc, s) => {
    const label =
      SKILL_CATEGORIES[s.category as keyof typeof SKILL_CATEGORIES] ??
      s.category;
    if (!acc[label]) acc[label] = [];
    acc[label]!.push(s.name);
    return acc;
  }, {});

  const skillGroups: ResumeDataSkillGroup[] = Object.entries(grouped).map(
    ([category, items]) => ({
      category,
      items,
    }),
  );

  const allSkillNames = skillGroups.flatMap((g) => g.items);
  const keywords = [siteConfig.title, ...allSkillNames.slice(0, 30)].join(", ");

  const visibleSections =
    (resume.visible_sections as unknown as string[]) ?? [
      "experience",
      "skills",
      "education",
      "certifications",
    ];

  return {
    name: siteConfig.name,
    title: siteConfig.title,
    email: siteConfig.email,
    phone: phoneEntry?.url,
    location: siteConfig.location,
    website: opts.websiteHost ?? "khubaibqaiser.com",
    socialLinks,
    summary: opts.summaryOverride ?? resume.default_summary,
    keywords,
    visibleSections,
    experience: experience.map((exp) => ({
      company: exp.company,
      role: exp.role,
      period: `${exp.start_date} – ${exp.end_date ?? "Present"}`,
      location: `${exp.location} (${
        exp.location_type.charAt(0).toUpperCase() + exp.location_type.slice(1)
      })`,
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
