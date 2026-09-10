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
  ATS_RESUME_LAYOUT_ID,
  CLASSIC_LAYOUT_ID,
  MODERN_BLUE_LAYOUT_ID,
  atsResumeLayoutForm,
  classicLayoutForm,
  modernBlueLayoutForm,
} from "@portfolio/shared/schemas";
import raw from "../../seed/content.json";

/**
 * Static portfolio content used by the fixture backend (local dev, e2e, and
 * unit tests) and the DynamoDB seed script. Sourced from committed
 * `seed/content.json` (generic demo). Owners keep real CV data in gitignored
 * `seed/content.local.json` — see `tryLoadLocalSeedDocument`.
 * Timestamps are fixed to keep tests deterministic.
 */
const TS = "2024-01-01T00:00:00.000Z";

export type SeedDocument = {
  hero: Record<string, unknown>;
  about: Record<string, unknown>;
  siteConfig: Record<string, unknown>;
  resume: Record<string, unknown> & {
    languages?: unknown;
    remote_work_line?: string | null;
    references_line?: string | null;
  };
  experience: Array<Record<string, unknown>>;
  projects: Array<Record<string, unknown>>;
  skills: Array<Record<string, unknown>>;
  testimonials: Array<Record<string, unknown>>;
  media: Array<Record<string, unknown>>;
};

export type ContentFixtureBundle = {
  heroFixture: Hero;
  aboutFixture: About;
  siteConfigFixture: SiteConfig;
  resumeFixture: Resume;
  experienceFixtures: Experience[];
  projectFixtures: Project[];
  skillFixtures: Skill[];
  testimonialFixtures: Testimonial[];
  mediaFixtures: Media[];
  resumeLayoutFixtures: ResumeLayout[];
};

export function buildContentFixturesFromRaw(doc: SeedDocument): ContentFixtureBundle {
  const resumeLayoutFixtures: ResumeLayout[] = [
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
    {
      id: ATS_RESUME_LAYOUT_ID,
      ...atsResumeLayoutForm(),
      created_at: TS,
      updated_at: TS,
      revision: 1,
    },
  ];

  return {
    heroFixture: {
      id: "hero",
      ...doc.hero,
      created_at: TS,
      updated_at: TS,
      revision: 1,
    } as Hero,
    aboutFixture: {
      id: "about",
      ...doc.about,
      created_at: TS,
      updated_at: TS,
      revision: 1,
    } as About,
    siteConfigFixture: {
      id: "site-config",
      ...doc.siteConfig,
      created_at: TS,
      updated_at: TS,
      revision: 1,
    } as SiteConfig,
    resumeFixture: {
      id: "resume",
      ...doc.resume,
      languages: doc.resume.languages ?? [],
      remote_work_line: doc.resume.remote_work_line ?? null,
      references_line: doc.resume.references_line ?? null,
      created_at: TS,
      updated_at: TS,
      revision: 1,
    } as Resume,
    experienceFixtures: doc.experience.map((row) => ({
      ...row,
      show_in_resume: (row as { show_in_resume?: boolean }).show_in_resume ?? true,
      created_at: TS,
      updated_at: TS,
      revision: 1,
    })) as Experience[],
    projectFixtures: doc.projects.map((row) => {
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
    }) as Project[],
    skillFixtures: doc.skills.map((row) => ({
      ...row,
      created_at: TS,
      updated_at: TS,
      revision: 1,
    })) as Skill[],
    testimonialFixtures: doc.testimonials.map((row) => ({
      ...row,
      created_at: TS,
      updated_at: TS,
      revision: 1,
    })) as Testimonial[],
    mediaFixtures: doc.media.map((row) => ({ ...row })) as Media[],
    resumeLayoutFixtures,
  };
}

const committed = buildContentFixturesFromRaw(raw as SeedDocument);

export const heroFixture = committed.heroFixture;
export const aboutFixture = committed.aboutFixture;
export const siteConfigFixture = committed.siteConfigFixture;
export const resumeFixture = committed.resumeFixture;
export const experienceFixtures = committed.experienceFixtures;
export const projectFixtures = committed.projectFixtures;
export const skillFixtures = committed.skillFixtures;
export const testimonialFixtures = committed.testimonialFixtures;
export const mediaFixtures = committed.mediaFixtures;
export const resumeLayoutFixtures = committed.resumeLayoutFixtures;
