import type {
  Hero,
  HeroFormData,
  About,
  AboutFormData,
  Experience,
  ExperienceFormData,
  Project,
  ProjectFormData,
  Skill,
  SkillFormData,
  Testimonial,
  TestimonialFormData,
  SiteConfig,
  SiteConfigFormData,
  Resume,
  ResumeFormData,
  ResumeVariant,
  ResumeVariantFormData,
  ResumeLayout,
  ResumeLayoutFormData,
  Media,
  MediaInsert,
  ResumeGeneration,
  ResumeGenerationInsert,
  ResumeGenerationUpdate,
} from "../schemas";

/** Aggregated spend over a time window, used by the cost cap. */
export type UsageSummary = {
  totalUsd: number;
  count: number;
};

/** A skill row to create or update; `id` present means update. */
export type SkillUpsert = SkillFormData & { id?: string };

/** Options for listing resume generation history. */
export type ResumeGenerationListOptions = {
  limit?: number;
  includeDeleted?: boolean;
};

/**
 * Backend-agnostic content store. The public site and admin dashboard depend
 * on this seam rather than any concrete database, so the underlying engine
 * (DynamoDB in production, fixtures/local in dev) can be swapped freely.
 *
 * Singletons (`hero`, `about`, `siteConfig`, `resume`) are upserted; list
 * entities follow insert/update/delete. Partial inputs allow patch updates.
 */
export type ContentRepository = {
  // Hero (singleton)
  getHero(): Promise<Hero>;
  upsertHero(values: Partial<HeroFormData>): Promise<void>;

  // About (singleton)
  getAbout(): Promise<About>;
  upsertAbout(values: Partial<AboutFormData>): Promise<void>;

  // Experience
  getExperience(): Promise<Experience[]>;
  getExperienceById(id: string): Promise<Experience>;
  insertExperience(values: ExperienceFormData): Promise<Experience>;
  updateExperience(id: string, values: Partial<ExperienceFormData>): Promise<void>;
  deleteExperience(id: string): Promise<void>;

  // Projects
  getProjects(): Promise<Project[]>;
  getFeaturedProjects(): Promise<Project[]>;
  getProjectById(id: string): Promise<Project>;
  getProjectBySlug(slug: string): Promise<Project | null>;
  insertProject(values: ProjectFormData): Promise<Project>;
  updateProject(id: string, values: Partial<ProjectFormData>): Promise<void>;
  deleteProject(id: string): Promise<void>;

  // Skills
  getSkills(): Promise<Skill[]>;
  upsertSkill(values: SkillUpsert): Promise<void>;
  batchUpsertSkills(skills: SkillUpsert[]): Promise<void>;
  deleteSkill(id: string): Promise<void>;

  // Testimonials
  getTestimonials(): Promise<Testimonial[]>;
  insertTestimonial(values: TestimonialFormData): Promise<Testimonial>;
  updateTestimonial(id: string, values: Partial<TestimonialFormData>): Promise<void>;
  deleteTestimonial(id: string): Promise<void>;

  // Site config (singleton)
  getSiteConfig(): Promise<SiteConfig>;
  upsertSiteConfig(values: Partial<SiteConfigFormData>): Promise<void>;

  // Resume (singleton)
  getResume(): Promise<Resume>;
  upsertResume(values: Partial<ResumeFormData>): Promise<void>;

  // Resume variants
  getResumeVariants(): Promise<ResumeVariant[]>;
  getResumeVariantById(id: string): Promise<ResumeVariant | null>;
  insertResumeVariant(values: ResumeVariantFormData): Promise<ResumeVariant>;
  updateResumeVariant(id: string, values: Partial<ResumeVariantFormData>): Promise<void>;
  deleteResumeVariant(id: string): Promise<void>;

  // Resume layout variants (visual templates + AI guidelines)
  getResumeLayouts(): Promise<ResumeLayout[]>;
  getResumeLayoutById(id: string): Promise<ResumeLayout | null>;
  insertResumeLayout(values: ResumeLayoutFormData): Promise<ResumeLayout>;
  updateResumeLayout(id: string, values: Partial<ResumeLayoutFormData>): Promise<void>;
  deleteResumeLayout(id: string): Promise<void>;

  // Media
  getMedia(): Promise<Media[]>;
  getMediaById(id: string): Promise<Media>;
  insertMedia(values: MediaInsert): Promise<Media>;
  deleteMediaRow(id: string): Promise<void>;

  // Resume generations (AI history)
  insertResumeGeneration(values: ResumeGenerationInsert): Promise<ResumeGeneration>;
  updateResumeGeneration(id: string, values: ResumeGenerationUpdate): Promise<void>;
  getResumeGenerations(
    options?: ResumeGenerationListOptions,
  ): Promise<ResumeGeneration[]>;
  getResumeGenerationById(id: string): Promise<ResumeGeneration | null>;
  sumDailyUsage(userId: string, windowHours?: number): Promise<UsageSummary>;
  sumMonthlyUsage(userId: string): Promise<UsageSummary>;
};
