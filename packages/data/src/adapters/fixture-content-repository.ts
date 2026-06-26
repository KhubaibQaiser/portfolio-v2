import { randomUUID } from "node:crypto";
import { sortExperienceByRecencyDesc } from "@portfolio/shared/experience-dates";
import type {
  ContentRepository,
  ResumeGenerationListOptions,
  SkillUpsert,
  UsageSummary,
} from "@portfolio/shared/ports";
import type {
  About,
  AboutFormData,
  Experience,
  ExperienceFormData,
  Hero,
  HeroFormData,
  Media,
  MediaInsert,
  Project,
  ProjectFormData,
  Resume,
  ResumeFormData,
  ResumeGeneration,
  ResumeGenerationInsert,
  ResumeGenerationUpdate,
  ResumeVariant,
  ResumeVariantFormData,
  SiteConfig,
  SiteConfigFormData,
  Skill,
  Testimonial,
  TestimonialFormData,
} from "@portfolio/shared/types";
import {
  aboutFixture,
  experienceFixtures,
  heroFixture,
  projectFixtures,
  resumeFixture,
  siteConfigFixture,
  skillFixtures,
  testimonialFixtures,
} from "../fixtures/content";

function now(): string {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

/**
 * In-memory {@link ContentRepository} seeded from the static fixtures. Mutations
 * affect a private clone so each instance is isolated and tests stay
 * deterministic. Used for local dev (no cloud), e2e, and unit tests.
 */
export function createFixtureContentRepository(): ContentRepository {
  let hero: Hero = clone(heroFixture);
  let about: About = clone(aboutFixture);
  let siteConfig: SiteConfig = clone(siteConfigFixture);
  let resume: Resume = clone(resumeFixture);
  const experience: Experience[] = clone(experienceFixtures);
  const projects: Project[] = clone(projectFixtures);
  const skills: Skill[] = clone(skillFixtures);
  const testimonials: Testimonial[] = clone(testimonialFixtures);
  const resumeVariants: ResumeVariant[] = [];
  const media: Media[] = [];
  const resumeGenerations: ResumeGeneration[] = [];

  function requireById<T extends { id: string }>(
    rows: T[],
    id: string,
    label: string,
  ): T {
    const row = rows.find((r) => r.id === id);
    if (!row) throw new Error(`${label} not found: ${id}`);
    return row;
  }

  return {
    // Hero
    async getHero() {
      return clone(hero);
    },
    async upsertHero(values: Partial<HeroFormData>) {
      hero = { ...hero, ...values, updated_at: now() };
    },

    // About
    async getAbout() {
      return clone(about);
    },
    async upsertAbout(values: Partial<AboutFormData>) {
      about = { ...about, ...values, updated_at: now() };
    },

    // Experience
    async getExperience() {
      return sortExperienceByRecencyDesc(clone(experience));
    },
    async getExperienceById(id: string) {
      return clone(requireById(experience, id, "Experience"));
    },
    async insertExperience(values: ExperienceFormData) {
      const row: Experience = {
        ...values,
        id: randomUUID(),
        created_at: now(),
        updated_at: now(),
      };
      experience.push(row);
      return clone(row);
    },
    async updateExperience(id: string, values: Partial<ExperienceFormData>) {
      const row = requireById(experience, id, "Experience");
      Object.assign(row, values, { updated_at: now() });
    },
    async deleteExperience(id: string) {
      const idx = experience.findIndex((r) => r.id === id);
      if (idx >= 0) experience.splice(idx, 1);
    },

    // Projects
    async getProjects() {
      return clone(projects).sort((a, b) => a.sort_order - b.sort_order);
    },
    async getFeaturedProjects() {
      return clone(projects)
        .filter((p) => p.is_featured)
        .sort((a, b) => a.sort_order - b.sort_order);
    },
    async getProjectById(id: string) {
      return clone(requireById(projects, id, "Project"));
    },
    async getProjectBySlug(slug: string) {
      const row = projects.find((p) => p.slug === slug);
      return row ? clone(row) : null;
    },
    async insertProject(values: ProjectFormData) {
      const row: Project = {
        ...values,
        id: randomUUID(),
        created_at: now(),
        updated_at: now(),
      };
      projects.push(row);
      return clone(row);
    },
    async updateProject(id: string, values: Partial<ProjectFormData>) {
      const row = requireById(projects, id, "Project");
      Object.assign(row, values, { updated_at: now() });
    },
    async deleteProject(id: string) {
      const idx = projects.findIndex((r) => r.id === id);
      if (idx >= 0) projects.splice(idx, 1);
    },

    // Skills
    async getSkills() {
      return clone(skills).sort(
        (a, b) => a.category.localeCompare(b.category) || a.sort_order - b.sort_order,
      );
    },
    async upsertSkill(values: SkillUpsert) {
      if (values.id) {
        const row = requireById(skills, values.id, "Skill");
        const { id: _id, ...rest } = values;
        Object.assign(row, rest, { updated_at: now() });
      } else {
        skills.push({
          ...values,
          id: randomUUID(),
          created_at: now(),
          updated_at: now(),
        });
      }
    },
    async batchUpsertSkills(rows: SkillUpsert[]) {
      for (const row of rows) {
        await this.upsertSkill(row);
      }
    },
    async deleteSkill(id: string) {
      const idx = skills.findIndex((r) => r.id === id);
      if (idx >= 0) skills.splice(idx, 1);
    },

    // Testimonials
    async getTestimonials() {
      return clone(testimonials).sort((a, b) => a.sort_order - b.sort_order);
    },
    async insertTestimonial(values: TestimonialFormData) {
      const row: Testimonial = {
        ...values,
        id: randomUUID(),
        created_at: now(),
        updated_at: now(),
      };
      testimonials.push(row);
      return clone(row);
    },
    async updateTestimonial(id: string, values: Partial<TestimonialFormData>) {
      const row = requireById(testimonials, id, "Testimonial");
      Object.assign(row, values, { updated_at: now() });
    },
    async deleteTestimonial(id: string) {
      const idx = testimonials.findIndex((r) => r.id === id);
      if (idx >= 0) testimonials.splice(idx, 1);
    },

    // Site config
    async getSiteConfig() {
      return clone(siteConfig);
    },
    async upsertSiteConfig(values: Partial<SiteConfigFormData>) {
      siteConfig = { ...siteConfig, ...values, updated_at: now() };
    },

    // Resume
    async getResume() {
      return clone(resume);
    },
    async upsertResume(values: Partial<ResumeFormData>) {
      resume = { ...resume, ...values, updated_at: now() };
    },

    // Resume variants
    async getResumeVariants() {
      return clone(resumeVariants);
    },
    async getResumeVariantById(id: string) {
      const row = resumeVariants.find((r) => r.id === id);
      return row ? clone(row) : null;
    },
    async insertResumeVariant(values: ResumeVariantFormData) {
      const row: ResumeVariant = {
        ...values,
        id: randomUUID(),
        created_at: now(),
        updated_at: now(),
      };
      resumeVariants.push(row);
      return clone(row);
    },
    async updateResumeVariant(id: string, values: Partial<ResumeVariantFormData>) {
      const row = requireById(resumeVariants, id, "ResumeVariant");
      Object.assign(row, values, { updated_at: now() });
    },
    async deleteResumeVariant(id: string) {
      const idx = resumeVariants.findIndex((r) => r.id === id);
      if (idx >= 0) resumeVariants.splice(idx, 1);
    },

    // Media
    async getMedia() {
      return clone(media).sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));
    },
    async getMediaById(id: string) {
      return clone(requireById(media, id, "Media"));
    },
    async insertMedia(values: MediaInsert) {
      const row: Media = {
        id: randomUUID(),
        filename: values.filename,
        url: values.url,
        mime_type: values.mime_type,
        size: values.size,
        alt_text: values.alt_text ?? null,
        uploaded_at: now(),
      };
      media.push(row);
      return clone(row);
    },
    async deleteMediaRow(id: string) {
      const idx = media.findIndex((r) => r.id === id);
      if (idx >= 0) media.splice(idx, 1);
    },

    // Resume generations
    async insertResumeGeneration(values: ResumeGenerationInsert) {
      const row: ResumeGeneration = {
        ...values,
        id: randomUUID(),
        created_at: now(),
        updated_at: now(),
      };
      resumeGenerations.push(row);
      return clone(row);
    },
    async updateResumeGeneration(id: string, values: ResumeGenerationUpdate) {
      const row = requireById(resumeGenerations, id, "ResumeGeneration");
      Object.assign(row, values, { updated_at: now() });
    },
    async getResumeGenerations(options: ResumeGenerationListOptions = {}) {
      const limit = options.limit ?? 20;
      return clone(resumeGenerations)
        .filter((r) => options.includeDeleted || r.deleted_at === null)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, limit);
    },
    async getResumeGenerationById(id: string) {
      const row = resumeGenerations.find((r) => r.id === id);
      return row ? clone(row) : null;
    },
    async sumDailyUsage(userId: string, windowHours = 24): Promise<UsageSummary> {
      const since = Date.now() - windowHours * 60 * 60 * 1000;
      const rows = resumeGenerations.filter(
        (r) =>
          r.created_by === userId &&
          r.deleted_at === null &&
          new Date(r.created_at).getTime() >= since,
      );
      const totalUsd = rows.reduce((sum, r) => sum + (r.usage?.costUsd ?? 0), 0);
      return { totalUsd, count: rows.length };
    },
    async sumMonthlyUsage(userId: string): Promise<UsageSummary> {
      return this.sumDailyUsage(userId, 24 * 30);
    },
  };
}
