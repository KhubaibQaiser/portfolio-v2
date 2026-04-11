import {
  fetchSiteConfig,
  fetchResume,
  fetchExperience,
  fetchSkills,
} from "@/lib/data";
import { SKILL_CATEGORIES } from "@portfolio/shared/constants";

export type ResumeData = {
  name: string;
  title: string;
  email: string;
  location: string;
  website: string;
  socialLinks: Array<{ platform: string; url: string; label: string }>;
  summary: string;
  experience: {
    company: string;
    role: string;
    period: string;
    location: string;
    bullets: string[];
    tech: string;
  }[];
  education: {
    degree: string;
    institution: string;
    year: string;
  }[];
  certifications: string[];
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

  const socialLinks = siteConfig.social_links as unknown as Array<{
    platform: string;
    url: string;
    label: string;
  }>;

  const education = (resume.education as unknown as Array<{
    degree: string;
    institution: string;
    year: string;
  }>) ?? [];

  const certifications = (resume.certifications as unknown as Array<{
    name: string;
  }>) ?? [];

  const grouped = skills.reduce<Record<string, string[]>>((acc, s) => {
    const label = SKILL_CATEGORIES[s.category as keyof typeof SKILL_CATEGORIES] ?? s.category;
    if (!acc[label]) acc[label] = [];
    acc[label].push(s.name);
    return acc;
  }, {});

  return {
    name: siteConfig.name,
    title: siteConfig.title,
    email: siteConfig.email,
    location: siteConfig.location,
    website: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://khubaibqaiser.com").replace(/^https?:\/\//, ""),
    socialLinks,
    summary: resume.default_summary,
    experience: experience.map((exp) => ({
      company: exp.company,
      role: exp.role,
      period: `${exp.start_date} – ${exp.end_date ?? "Present"}`,
      location: `${exp.location} (${exp.location_type.charAt(0).toUpperCase() + exp.location_type.slice(1)})`,
      bullets: exp.description.split("\n").filter(Boolean),
      tech: exp.tech_tags.join(", "),
    })),
    education,
    certifications: certifications.map((c) => c.name),
    skills: Object.entries(grouped).map(([category, items]) => ({
      category,
      items,
    })),
  };
}
