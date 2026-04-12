import {
  fetchSiteConfig,
  fetchResume,
  fetchExperience,
  fetchSkills,
} from "@/lib/data";
import { SKILL_CATEGORIES } from "@portfolio/shared/constants";
import { getContractTypeLabel } from "@portfolio/shared/schemas";

type SocialLink = { platform: string; url: string; label: string };

export type ResumeData = {
  name: string;
  title: string;
  email: string;
  phone?: string;
  location: string;
  website: string;
  socialLinks: SocialLink[];
  summary: string;
  keywords: string;
  visibleSections: string[];
  experience: {
    company: string;
    role: string;
    period: string;
    location: string;
    contractType: string;
    bullets: string[];
    tech: string;
  }[];
  education: {
    degree: string;
    institution: string;
    year: string;
  }[];
  certifications: { name: string; issuer: string }[];
  skills: {
    category: string;
    items: string[];
  }[];
};

export async function getResumeData(): Promise<ResumeData> {
  const [siteConfig, resume, experience, skills] = await Promise.all([
    fetchSiteConfig(),
    fetchResume(),
    fetchExperience(),
    fetchSkills(),
  ]);

  const socialLinks = siteConfig.social_links as unknown as SocialLink[];

  const phoneEntry = socialLinks.find((l) => l.platform === "phone");

  const education =
    (resume.education as unknown as Array<{
      degree: string;
      institution: string;
      year: string;
    }>) ?? [];

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
    acc[label].push(s.name);
    return acc;
  }, {});

  const skillGroups = Object.entries(grouped).map(([category, items]) => ({
    category,
    items,
  }));

  const allSkillNames = skillGroups.flatMap((g) => g.items);
  const keywords = [
    siteConfig.title,
    ...allSkillNames.slice(0, 30),
  ].join(", ");

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
    website: (
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://khubaibqaiser.com"
    ).replace(/^https?:\/\//, ""),
    socialLinks,
    summary: resume.default_summary,
    keywords,
    visibleSections,
    experience: experience.map((exp) => ({
      company: exp.company,
      role: exp.role,
      period: `${exp.start_date} – ${exp.end_date ?? "Present"}`,
      location: `${exp.location} (${exp.location_type.charAt(0).toUpperCase() + exp.location_type.slice(1)})`,
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
