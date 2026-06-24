import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { CreateEntityItem, EntityItem } from "electrodb";
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
  ResumeGenerationUsage,
  ResumeVariant,
  ResumeVariantFormData,
  SiteConfig,
  SiteConfigFormData,
  Skill,
  Testimonial,
  TestimonialFormData,
} from "@portfolio/shared/types";
import { sortExperienceByRecencyDesc } from "@portfolio/shared/experience-dates";
import { uniqueCompanyCount } from "@portfolio/shared/experience-stats";
import { createEntities, type PortfolioEntities } from "../dynamo/entities";

type WriteValues = Record<string, unknown>;

/** Drops null/undefined so ElectroDB stores absent attributes instead of null. */
function writable(values: WriteValues): WriteValues {
  const out: WriteValues = {};
  for (const [key, value] of Object.entries(values)) {
    if (value !== null && value !== undefined) out[key] = value;
  }
  return out;
}

/**
 * Drops null `url` from nested resume items. `writable` only strips top-level
 * nulls, but these urls live inside list/map attributes whose ElectroDB schema
 * types `url` as an (absent-or-string) value and rejects an explicit null.
 */
function stripNullUrl<T extends { url?: string | null }>(
  items: readonly T[],
): Array<Omit<T, "url"> & { url?: string }> {
  return items.map(({ url, ...rest }) => (url == null ? rest : { ...rest, url }));
}

type ExperienceItem = EntityItem<PortfolioEntities["experience"]>;
type ProjectItem = EntityItem<PortfolioEntities["project"]>;
type SkillItem = EntityItem<PortfolioEntities["skill"]>;
type TestimonialItem = EntityItem<PortfolioEntities["testimonial"]>;
type ResumeVariantItem = EntityItem<PortfolioEntities["resumeVariant"]>;
type MediaItem = EntityItem<PortfolioEntities["media"]>;
type ResumeGenerationItem = EntityItem<PortfolioEntities["resumeGeneration"]>;
type HeroItem = EntityItem<PortfolioEntities["hero"]>;
type AboutItem = EntityItem<PortfolioEntities["about"]>;
type SiteConfigItem = EntityItem<PortfolioEntities["siteConfig"]>;
type ResumeItem = EntityItem<PortfolioEntities["resume"]>;

function toHero(item: HeroItem): Hero {
  return { id: "hero", ...item };
}

function toAbout(item: AboutItem): About {
  return { id: "about", ...item };
}

function toSiteConfig(item: SiteConfigItem): SiteConfig {
  return { id: "site-config", ...item };
}

function toResume(item: ResumeItem): Resume {
  return {
    id: "resume",
    ...item,
    education: item.education.map((e) => ({ ...e, url: e.url ?? null })),
    certifications: item.certifications.map((c) => ({
      ...c,
      url: c.url ?? null,
    })),
    voice_sample: item.voice_sample ?? null,
  };
}

function toExperience(item: ExperienceItem): Experience {
  return {
    ...item,
    end_date: item.end_date ?? null,
    logo_url: item.logo_url ?? null,
    company_url: item.company_url ?? null,
  };
}

function toProject(item: ProjectItem): Project {
  return {
    ...item,
    cover_url: item.cover_url ?? null,
    github_url: item.github_url ?? null,
    live_url: item.live_url ?? null,
    playstore_url: item.playstore_url ?? null,
    appstore_url: item.appstore_url ?? null,
  };
}

function toSkill(item: SkillItem): Skill {
  return { ...item, icon: item.icon ?? null };
}

function toTestimonial(item: TestimonialItem): Testimonial {
  return { ...item, avatar_url: item.avatar_url ?? null };
}

function toResumeVariant(item: ResumeVariantItem): ResumeVariant {
  return { ...item, summary_override: item.summary_override ?? null };
}

function toMedia(item: MediaItem): Media {
  return { ...item, alt_text: item.alt_text ?? null };
}

function toResumeGeneration(item: ResumeGenerationItem): ResumeGeneration {
  return {
    id: item.id,
    created_by: item.created_by,
    company: item.company ?? null,
    role: item.role ?? null,
    hiring_manager: item.hiring_manager ?? null,
    language: item.language,
    tone: item.tone ?? null,
    length: item.length ?? null,
    jd_text: item.jd_text,
    jd_source: item.jd_source,
    jd_pdf_url: item.jd_pdf_url ?? null,
    model: item.model,
    fallback_used: item.fallback_used,
    resume: (item.resume as Record<string, unknown> | undefined) ?? null,
    cover_letter: (item.cover_letter as Record<string, unknown> | undefined) ?? null,
    ats: (item.ats as Record<string, unknown> | undefined) ?? null,
    usage: (item.usage as ResumeGenerationUsage | undefined) ?? null,
    resume_pdf_url: item.resume_pdf_url ?? null,
    cover_letter_pdf_url: item.cover_letter_pdf_url ?? null,
    archived_at: item.archived_at ?? null,
    deleted_at: item.deleted_at ?? null,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

/**
 * DynamoDB-backed {@link ContentRepository} built on the single-table ElectroDB
 * model. Boundary mappers convert ElectroDB's absent attributes back into the
 * `null`-shaped domain types the apps expect.
 */
export function createDynamoContentRepository(
  client: DynamoDBDocumentClient,
  table: string,
): ContentRepository {
  const e = createEntities({ client, table });

  /**
   * Reads the current singleton, merges the (null-stripped) patch, and writes
   * the whole item back. Generic over the entity's read/write thunks so each
   * singleton keeps its own types without per-entity duplication.
   */
  async function upsertSingleton<TItem extends Record<string, unknown>>(
    read: () => Promise<{ data: TItem | null }>,
    write: (item: TItem) => Promise<unknown>,
    values: WriteValues,
  ): Promise<void> {
    const current = await read();
    await write({ ...(current.data ?? {}), ...writable(values) } as TItem);
  }

  return {
    // Hero
    async getHero() {
      const { data } = await e.hero.get({}).go();
      if (!data) throw new Error("Hero is not configured");
      return toHero(data);
    },
    async upsertHero(values: Partial<HeroFormData>) {
      await upsertSingleton(
        () => e.hero.get({}).go(),
        (item) => e.hero.put(item).go(),
        values,
      );
    },

    // About
    async getAbout() {
      const { data } = await e.about.get({}).go();
      if (!data) throw new Error("About is not configured");
      return toAbout(data);
    },
    async upsertAbout(values: Partial<AboutFormData>) {
      await upsertSingleton(
        () => e.about.get({}).go(),
        (item) => e.about.put(item).go(),
        values,
      );
    },
    async syncCompaniesCountFromExperience() {
      const { data } = await e.experience.query.primary({}).go();
      const count = uniqueCompanyCount(data);
      await upsertSingleton(
        () => e.about.get({}).go(),
        (item) => e.about.put(item).go(),
        { companies_count: count },
      );
    },

    // Experience
    async getExperience() {
      const { data } = await e.experience.query.primary({}).go();
      return sortExperienceByRecencyDesc(data.map(toExperience));
    },
    async getExperienceById(id: string) {
      const { data } = await e.experience.get({ id }).go();
      if (!data) throw new Error(`Experience not found: ${id}`);
      return toExperience(data);
    },
    async insertExperience(values: ExperienceFormData) {
      const { data } = await e.experience
        .create(writable(values) as CreateEntityItem<PortfolioEntities["experience"]>)
        .go();
      return toExperience(data);
    },
    async updateExperience(id: string, values: Partial<ExperienceFormData>) {
      await e.experience
        .patch({ id })
        .set(writable(values) as Partial<ExperienceItem>)
        .go();
    },
    async deleteExperience(id: string) {
      await e.experience.delete({ id }).go();
    },

    // Projects
    async getProjects() {
      const { data } = await e.project.query.primary({}).go();
      return data.map(toProject).sort((a, b) => a.sort_order - b.sort_order);
    },
    async getFeaturedProjects() {
      const { data } = await e.project.query.primary({}).go();
      return data
        .map(toProject)
        .filter((p) => p.is_featured)
        .sort((a, b) => a.sort_order - b.sort_order);
    },
    async getProjectById(id: string) {
      const { data } = await e.project.get({ id }).go();
      if (!data) throw new Error(`Project not found: ${id}`);
      return toProject(data);
    },
    async getProjectBySlug(slug: string) {
      const { data } = await e.project.query.bySlug({ slug }).go();
      const first = data[0];
      return first ? toProject(first) : null;
    },
    async insertProject(values: ProjectFormData) {
      const { data } = await e.project
        .create(writable(values) as CreateEntityItem<PortfolioEntities["project"]>)
        .go();
      return toProject(data);
    },
    async updateProject(id: string, values: Partial<ProjectFormData>) {
      await e.project
        .patch({ id })
        .set(writable(values) as Partial<ProjectItem>)
        .go();
    },
    async deleteProject(id: string) {
      await e.project.delete({ id }).go();
    },

    // Skills
    async getSkills() {
      const { data } = await e.skill.query.primary({}).go();
      return data
        .map(toSkill)
        .sort(
          (a, b) => a.category.localeCompare(b.category) || a.sort_order - b.sort_order,
        );
    },
    async upsertSkill(values: SkillUpsert) {
      const { id, ...rest } = values;
      if (id) {
        await e.skill
          .patch({ id })
          .set(writable(rest) as Partial<SkillItem>)
          .go();
      } else {
        await e.skill
          .create(writable(rest) as CreateEntityItem<PortfolioEntities["skill"]>)
          .go();
      }
    },
    async batchUpsertSkills(rows: SkillUpsert[]) {
      for (const row of rows) {
        await this.upsertSkill(row);
      }
    },
    async deleteSkill(id: string) {
      await e.skill.delete({ id }).go();
    },

    // Testimonials
    async getTestimonials() {
      const { data } = await e.testimonial.query.primary({}).go();
      return data.map(toTestimonial).sort((a, b) => a.sort_order - b.sort_order);
    },
    async insertTestimonial(values: TestimonialFormData) {
      const { data } = await e.testimonial
        .create(writable(values) as CreateEntityItem<PortfolioEntities["testimonial"]>)
        .go();
      return toTestimonial(data);
    },
    async updateTestimonial(id: string, values: Partial<TestimonialFormData>) {
      await e.testimonial
        .patch({ id })
        .set(writable(values) as Partial<TestimonialItem>)
        .go();
    },
    async deleteTestimonial(id: string) {
      await e.testimonial.delete({ id }).go();
    },

    // Site config
    async getSiteConfig() {
      const { data } = await e.siteConfig.get({}).go();
      if (!data) throw new Error("Site config is not configured");
      return toSiteConfig(data);
    },
    async upsertSiteConfig(values: Partial<SiteConfigFormData>) {
      await upsertSingleton(
        () => e.siteConfig.get({}).go(),
        (item) => e.siteConfig.put(item).go(),
        values,
      );
    },

    // Resume
    async getResume() {
      const { data } = await e.resume.get({}).go();
      if (!data) throw new Error("Resume is not configured");
      return toResume(data);
    },
    async upsertResume(values: Partial<ResumeFormData>) {
      const sanitized: WriteValues = { ...values };
      if (values.education) {
        sanitized.education = stripNullUrl(values.education);
      }
      if (values.certifications) {
        sanitized.certifications = stripNullUrl(values.certifications);
      }
      await upsertSingleton(
        () => e.resume.get({}).go(),
        (item) => e.resume.put(item).go(),
        sanitized,
      );
    },

    // Resume variants
    async getResumeVariants() {
      const { data } = await e.resumeVariant.query.primary({}).go();
      return data.map(toResumeVariant);
    },
    async getResumeVariantById(id: string) {
      const { data } = await e.resumeVariant.get({ id }).go();
      return data ? toResumeVariant(data) : null;
    },
    async insertResumeVariant(values: ResumeVariantFormData) {
      const { data } = await e.resumeVariant
        .create(writable(values) as CreateEntityItem<PortfolioEntities["resumeVariant"]>)
        .go();
      return toResumeVariant(data);
    },
    async updateResumeVariant(id: string, values: Partial<ResumeVariantFormData>) {
      await e.resumeVariant
        .patch({ id })
        .set(writable(values) as Partial<ResumeVariantItem>)
        .go();
    },
    async deleteResumeVariant(id: string) {
      await e.resumeVariant.delete({ id }).go();
    },

    // Media
    async getMedia() {
      const { data } = await e.media.query.primary({}).go();
      return data.map(toMedia).sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));
    },
    async getMediaById(id: string) {
      const { data } = await e.media.get({ id }).go();
      if (!data) throw new Error(`Media not found: ${id}`);
      return toMedia(data);
    },
    async insertMedia(values: MediaInsert) {
      const { data } = await e.media
        .create(writable(values) as CreateEntityItem<PortfolioEntities["media"]>)
        .go();
      return toMedia(data);
    },
    async deleteMediaRow(id: string) {
      await e.media.delete({ id }).go();
    },

    // Resume generations
    async insertResumeGeneration(values: ResumeGenerationInsert) {
      const { data } = await e.resumeGeneration
        .create(
          writable(values) as CreateEntityItem<PortfolioEntities["resumeGeneration"]>,
        )
        .go();
      return toResumeGeneration(data);
    },
    async updateResumeGeneration(id: string, values: ResumeGenerationUpdate) {
      await e.resumeGeneration
        .patch({ id })
        .set(writable(values) as Partial<ResumeGenerationItem>)
        .go();
    },
    async getResumeGenerations(options: ResumeGenerationListOptions = {}) {
      const limit = options.limit ?? 20;
      const { data } = await e.resumeGeneration.query.primary({}).go();
      return data
        .map(toResumeGeneration)
        .filter((r) => options.includeDeleted || r.deleted_at === null)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, limit);
    },
    async getResumeGenerationById(id: string) {
      const { data } = await e.resumeGeneration.get({ id }).go();
      return data ? toResumeGeneration(data) : null;
    },
    async sumDailyUsage(userId: string, windowHours = 24): Promise<UsageSummary> {
      const since = Date.now() - windowHours * 60 * 60 * 1000;
      const { data } = await e.resumeGeneration.query.primary({}).go();
      const rows = data
        .map(toResumeGeneration)
        .filter(
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
