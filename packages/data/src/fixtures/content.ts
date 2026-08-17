import type {
  About,
  Experience,
  Hero,
  Media,
  Project,
  Resume,
  ResumeLayout,
  SiteConfig,
  Skill,
  Testimonial,
} from "@portfolio/shared/types";
import {
  CLASSIC_LAYOUT_ID,
  MODERN_BLUE_LAYOUT_ID,
  classicLayoutForm,
  modernBlueLayoutForm,
} from "@portfolio/shared/schemas";
import raw from "../../seed/content.json";

/**
 * Static portfolio content used by the fixture backend (local dev, e2e, and
 * unit tests) and the DynamoDB seed script. Sourced from `seed/content.json`,
 * generated from admin CSV exports via `scripts/generate-seed-from-export.py`.
 * Timestamps are fixed to keep tests deterministic.
 */
const TS = "2024-01-01T00:00:00.000Z";

export const heroFixture: Hero = {
  id: "hero",
  ...raw.hero,
  created_at: TS,
  updated_at: TS,
  revision: 1,
} as Hero;

export const aboutFixture: About = {
  id: "about",
  ...raw.about,
  created_at: TS,
  updated_at: TS,
  revision: 1,
} as About;

export const siteConfigFixture: SiteConfig = {
  id: "site-config",
  ...raw.siteConfig,
  created_at: TS,
  updated_at: TS,
  revision: 1,
} as SiteConfig;

export const resumeFixture: Resume = {
  id: "resume",
  ...raw.resume,
  languages: raw.resume.languages ?? [],
  remote_work_line: raw.resume.remote_work_line ?? null,
  references_line: raw.resume.references_line ?? null,
  created_at: TS,
  updated_at: TS,
  revision: 1,
} as Resume;

export const experienceFixtures: Experience[] = raw.experience.map((row) => ({
  ...row,
  show_in_resume: (row as { show_in_resume?: boolean }).show_in_resume ?? true,
  created_at: TS,
  updated_at: TS,
  revision: 1,
})) as Experience[];

export const projectFixtures: Project[] = raw.projects.map((row) => {
  const r = row as {
    show_in_resume?: boolean;
    resume_status?: string | null;
    resume_description?: string;
  };
  return {
    ...row,
    show_in_resume: r.show_in_resume ?? false,
    resume_status: r.resume_status ?? null,
    resume_description: r.resume_description ?? "",
    created_at: TS,
    updated_at: TS,
    revision: 1,
  };
}) as Project[];

export const skillFixtures: Skill[] = raw.skills.map((row) => ({
  ...row,
  created_at: TS,
  updated_at: TS,
  revision: 1,
})) as Skill[];

export const testimonialFixtures: Testimonial[] = raw.testimonials.map((row) => ({
  ...row,
  created_at: TS,
  updated_at: TS,
  revision: 1,
})) as Testimonial[];

/** Media metadata rows (object bytes live in S3; seed stores the catalog row). */
export const mediaFixtures: Media[] = raw.media.map((row) => ({ ...row })) as Media[];

export const resumeLayoutFixtures: ResumeLayout[] = [
  {
    id: CLASSIC_LAYOUT_ID,
    ...classicLayoutForm(),
    created_at: TS,
    updated_at: TS,
    revision: 1,
  },
  {
    id: MODERN_BLUE_LAYOUT_ID,
    ...modernBlueLayoutForm(),
    created_at: TS,
    updated_at: TS,
    revision: 1,
  },
];
