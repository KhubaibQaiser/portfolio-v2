import type {
  About,
  Experience,
  Hero,
  Media,
  Project,
  Resume,
  SiteConfig,
  Skill,
  Testimonial,
} from "@portfolio/shared/types";
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
} as Hero;

export const aboutFixture: About = {
  id: "about",
  ...raw.about,
  created_at: TS,
  updated_at: TS,
} as About;

export const siteConfigFixture: SiteConfig = {
  id: "site-config",
  ...raw.siteConfig,
  created_at: TS,
  updated_at: TS,
} as SiteConfig;

export const resumeFixture: Resume = {
  id: "resume",
  ...raw.resume,
  created_at: TS,
  updated_at: TS,
} as Resume;

export const experienceFixtures: Experience[] = raw.experience.map((row) => ({
  ...row,
  show_in_resume:
    (row as { show_in_resume?: boolean }).show_in_resume ?? true,
  created_at: TS,
  updated_at: TS,
})) as Experience[];

export const projectFixtures: Project[] = raw.projects.map((row) => ({
  ...row,
  created_at: TS,
  updated_at: TS,
})) as Project[];

export const skillFixtures: Skill[] = raw.skills.map((row) => ({
  ...row,
  created_at: TS,
  updated_at: TS,
})) as Skill[];

export const testimonialFixtures: Testimonial[] = raw.testimonials.map((row) => ({
  ...row,
  created_at: TS,
  updated_at: TS,
})) as Testimonial[];

/** Media metadata rows (object bytes live in S3; seed stores the catalog row). */
export const mediaFixtures: Media[] = raw.media.map((row) => ({ ...row })) as Media[];
