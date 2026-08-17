import { randomUUID } from "node:crypto";
import {
  type DynamoDBDocumentClient,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import type {
  ContentRepository,
  ResumeGenerationListOptions,
  SkillUpsert,
  UsageSummary,
} from "@portfolio/shared/ports";
import { ContentConflictError } from "@portfolio/shared/concurrency";
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
  ResumeLayout,
  ResumeLayoutFormData,
  SiteConfig,
  SiteConfigFormData,
  Skill,
  Testimonial,
  TestimonialFormData,
} from "@portfolio/shared/types";
import { sortExperienceByRecencyDesc } from "@portfolio/shared/experience-dates";
import { sortRecommendationsByDateDesc } from "@portfolio/shared/recommendation-dates";
import {
  aboutRowSchema,
  experienceRowSchema,
  heroRowSchema,
  mediaRowSchema,
  normalizeResumeLayoutGuidelines,
  projectRowSchema,
  resumeLayoutRowSchema,
  resumeRowSchema,
  resumeVariantRowSchema,
  siteConfigRowSchema,
  skillRowSchema,
  testimonialRowSchema,
} from "@portfolio/shared/schemas";
import { z } from "zod";
import type { TableNames } from "../dynamo/tables";

type Item = Record<string, unknown>;
type WriteValues = Record<string, unknown>;

/** Section keys for the singletons stored in the `content` table. */
const SECTION = {
  hero: "hero",
  about: "about",
  siteConfig: "site-config",
  resume: "resume",
} as const;

/**
 * Constant partition key for the resume-generation `recent` GSI. All rows share
 * it so the history feed is a single bounded `Query` (newest-first) instead of a
 * full-table `Scan`. The write volume (a human generating resumes) is far below
 * any single-partition limit, so the constant key is safe here.
 */
const RESUME_GENERATION_RECENT_PK = "resume-generation";

function now(): string {
  return new Date().toISOString();
}

/** Drops null/undefined so absent attributes are stored instead of nulls. */
function writable(values: WriteValues): WriteValues {
  const out: WriteValues = {};
  for (const [key, value] of Object.entries(values)) {
    if (value !== null && value !== undefined) out[key] = value;
  }
  return out;
}

/** Drops null `url` from nested resume items (schema allows absent, not null). */
function stripNullUrl<T extends { url?: string | null }>(
  items: readonly T[],
): Array<Omit<T, "url"> & { url?: string }> {
  return items.map(({ url, ...rest }) => (url == null ? rest : { ...rest, url }));
}

// --- Boundary mappers: normalize DynamoDB's absent attributes, then validate the
// complete domain row with the shared Zod schema before it can reach callers.

function parseRow<T>(schema: z.ZodType<T>, label: string, item: Item): T {
  const result = schema.safeParse(item);
  if (!result.success) {
    const key = (item.id ?? item.section ?? "unknown").toString();
    throw new Error(
      `Invalid ${label} record "${key}": ${result.error.issues
        .slice(0, 3)
        .map((issue) => `${issue.path.join(".") || "root"} ${issue.message}`)
        .join("; ")}`,
    );
  }
  return result.data;
}

function toHero(item: Item): Hero {
  const { section: _section, ...rest } = item;
  return parseRow(heroRowSchema, "hero", { id: SECTION.hero, ...rest });
}

function toAbout(item: Item): About {
  const { section: _section, ...rest } = item;
  return parseRow(aboutRowSchema, "about", { id: SECTION.about, ...rest });
}

function toSiteConfig(item: Item): SiteConfig {
  const { section: _section, ...rest } = item;
  return parseRow(siteConfigRowSchema, "site config", {
    id: SECTION.siteConfig,
    ...rest,
  });
}

function toResume(item: Item): Resume {
  const { section: _section, ...rest } = item;
  const r = rest as Partial<Omit<Resume, "id">>;
  return parseRow(resumeRowSchema, "resume", {
    id: SECTION.resume,
    ...r,
    education: (r.education ?? []).map((e) => ({ ...e, url: e.url ?? null })),
    certifications: (r.certifications ?? []).map((c) => ({ ...c, url: c.url ?? null })),
    voice_sample: r.voice_sample ?? null,
    languages: r.languages ?? [],
    remote_work_line: r.remote_work_line ?? null,
    references_line: r.references_line ?? null,
  });
}

function toExperience(item: Item): Experience {
  const e = item as Partial<Experience>;
  return parseRow(experienceRowSchema, "experience", {
    ...e,
    end_date: e.end_date ?? null,
    logo_url: e.logo_url ?? null,
    company_url: e.company_url ?? null,
    show_in_resume: e.show_in_resume ?? true,
  });
}

function toProject(item: Item): Project {
  const p = item as Partial<Project>;
  return parseRow(projectRowSchema, "project", {
    ...p,
    cover_url: p.cover_url ?? null,
    github_url: p.github_url ?? null,
    live_url: p.live_url ?? null,
    playstore_url: p.playstore_url ?? null,
    appstore_url: p.appstore_url ?? null,
    show_in_resume: p.show_in_resume ?? false,
    resume_status: p.resume_status ?? null,
    resume_description: p.resume_description ?? "",
  });
}

function toSkill(item: Item): Skill {
  const s = item as Partial<Skill>;
  return parseRow(skillRowSchema, "skill", { ...s, icon: s.icon ?? null });
}

function toTestimonial(item: Item): Testimonial {
  const t = item as Partial<Testimonial>;
  return parseRow(testimonialRowSchema, "testimonial", {
    ...t,
    avatar_url: t.avatar_url ?? null,
  });
}

function toResumeVariant(item: Item): ResumeVariant {
  const v = item as Partial<ResumeVariant>;
  return parseRow(resumeVariantRowSchema, "resume variant", {
    ...v,
    summary_override: v.summary_override ?? null,
  });
}

function toResumeLayout(item: Item): ResumeLayout {
  const v = item as Partial<ResumeLayout>;
  const componentKey = v.component_key ?? "classic";
  const version =
    componentKey === "modern-blue" && typeof v.version === "number" && v.version < 4
      ? 4
      : v.version;
  return parseRow(resumeLayoutRowSchema, "resume layout", {
    ...v,
    version,
    guidelines: v.guidelines
      ? normalizeResumeLayoutGuidelines(componentKey, version ?? 1, v.guidelines)
      : undefined,
    preview_image_url: v.preview_image_url ?? null,
    is_default: v.is_default ?? false,
  });
}

function toMedia(item: Item): Media {
  const m = item as Partial<Media>;
  return parseRow(mediaRowSchema, "media", { ...m, alt_text: m.alt_text ?? null });
}

const resumeGenerationRowSchema = z
  .object({
    id: z.string().min(1),
    created_by: z.string().min(1),
    company: z.string().nullable().default(null),
    role: z.string().nullable().default(null),
    hiring_manager: z.string().nullable().default(null),
    language: z.enum(["en", "de", "fr"]),
    tone: z.enum(["formal", "friendly", "enthusiastic"]).nullable().default(null),
    length: z.enum(["short", "standard", "detailed"]).nullable().default(null),
    jd_text: z.string(),
    jd_source: z.enum(["paste", "pdf"]),
    jd_pdf_url: z.string().nullable().default(null),
    model: z.string().min(1),
    fallback_used: z.boolean(),
    resume: z.record(z.string(), z.unknown()).nullable().default(null),
    cover_letter: z.record(z.string(), z.unknown()).nullable().default(null),
    ats: z.record(z.string(), z.unknown()).nullable().default(null),
    usage: z.record(z.string(), z.unknown()).nullable().default(null),
    resume_pdf_url: z.string().nullable().default(null),
    cover_letter_pdf_url: z.string().nullable().default(null),
    layout_id: z.string().nullable().default(null),
    applied_changes: z.array(z.string()).default([]),
    generation_version: z.literal(2).optional(),
    source_snapshot: z
      .object({
        sourceHash: z.string().min(1),
        guidelineHash: z.string().min(1),
        layoutVersion: z.number().int().min(1),
        experience: z.array(
          z.object({ id: z.string().min(1), bulletHashes: z.array(z.string()) }),
        ),
        skills: z.array(z.string()),
      })
      .optional(),
    archived_at: z.string().nullable().default(null),
    deleted_at: z.string().nullable().default(null),
    created_at: z.string().min(1),
    updated_at: z.string().min(1),
    revision: z.number().int().min(1).default(1),
  })
  .strip();

function toResumeGeneration(item: Item): ResumeGeneration {
  const { recent_pk: _recentPk, ...rest } = item;
  return parseRow(
    resumeGenerationRowSchema,
    "resume generation",
    rest,
  ) as ResumeGeneration;
}

/**
 * Multi-table {@link ContentRepository} on plain DynamoDB (no ORM). Singletons
 * live as one item each in the `content` table keyed by `section`; collections
 * each get their own table keyed by `id`, listed via a fully-paginated `Scan`
 * (tables are small, read-mostly, and ISR-cached) and looked up by GSI where
 * needed (`project` by slug, `resume-generation` by user for usage and by the
 * `recent` index for the bounded history feed). Boundary mappers restore the
 * `null`-shaped domain types from DynamoDB's absent attributes.
 */
export function createMultiTableContentRepository(
  client: DynamoDBDocumentClient,
  tables: TableNames,
): ContentRepository {
  async function getItem(table: string, key: Item): Promise<Item | null> {
    const { Item: item } = await client.send(
      new GetCommand({ TableName: table, Key: key }),
    );
    return item ?? null;
  }

  async function putItem(table: string, item: Item): Promise<void> {
    await client.send(new PutCommand({ TableName: table, Item: item }));
  }

  function revisionOf(item: Item | null): number {
    const value = item?.revision;
    return typeof value === "number" && Number.isInteger(value) && value >= 1 ? value : 1;
  }

  async function putWithRevision(
    table: string,
    keyName: "id" | "section",
    item: Item,
    expectedRevision?: number,
  ): Promise<void> {
    try {
      await client.send(
        new PutCommand({
          TableName: table,
          Item: item,
          ConditionExpression:
            expectedRevision === undefined
              ? "attribute_not_exists(#pk)"
              : "attribute_not_exists(#pk) OR #revision = :expectedRevision OR attribute_not_exists(#revision)",
          ExpressionAttributeNames: {
            "#pk": keyName,
            "#revision": "revision",
          },
          ...(expectedRevision !== undefined
            ? { ExpressionAttributeValues: { ":expectedRevision": expectedRevision } }
            : {}),
        }),
      );
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        throw new ContentConflictError();
      }
      throw error;
    }
  }

  /** Full, paginated scan — never truncates at the 1MB page boundary. Used only
   *  for the small, read-mostly content/collection tables. */
  async function listItems(table: string): Promise<Item[]> {
    const items: Item[] = [];
    let cursor: Item | undefined;
    do {
      const page = await client.send(
        new ScanCommand({ TableName: table, ExclusiveStartKey: cursor }),
      );
      if (page.Items) items.push(...page.Items);
      cursor = page.LastEvaluatedKey;
    } while (cursor);
    return items;
  }

  async function deleteItem(table: string, key: Item): Promise<void> {
    await client.send(new DeleteCommand({ TableName: table, Key: key }));
  }

  /** Reads, merges the (null-stripped) patch, and writes the whole singleton. */
  async function upsertSingleton(
    section: string,
    values: WriteValues,
    expectedRevision?: number,
  ): Promise<void> {
    const current = await getItem(tables.content, { section });
    const revision = revisionOf(current);
    const created_at = (current?.created_at as string | undefined) ?? now();
    await putWithRevision(
      tables.content,
      "section",
      {
        ...(current ?? {}),
        ...writable(values),
        section,
        created_at,
        updated_at: now(),
        revision: revision + 1,
      },
      expectedRevision ?? (current ? revision : undefined),
    );
  }

  /** Reads a list row by id, merges a patch, and writes it back. */
  async function patchRow(
    table: string,
    id: string,
    label: string,
    values: WriteValues,
    expectedRevision?: number,
  ): Promise<void> {
    const current = await getItem(table, { id });
    if (!current) throw new Error(`${label} not found: ${id}`);
    const revision = revisionOf(current);
    await putWithRevision(
      table,
      "id",
      {
        ...current,
        ...writable(values),
        id,
        updated_at: now(),
        revision: revision + 1,
      },
      expectedRevision ?? revision,
    );
  }

  function insertRow(values: WriteValues): Item {
    const timestamp = now();
    return {
      ...writable(values),
      id: randomUUID(),
      created_at: timestamp,
      updated_at: timestamp,
      revision: 1,
    };
  }

  return {
    // Hero
    async getHero() {
      const item = await getItem(tables.content, { section: SECTION.hero });
      if (!item) throw new Error("Hero is not configured");
      return toHero(item);
    },
    async upsertHero(values: Partial<HeroFormData>, expectedRevision?: number) {
      await upsertSingleton(SECTION.hero, values, expectedRevision);
    },

    // About
    async getAbout() {
      const item = await getItem(tables.content, { section: SECTION.about });
      if (!item) throw new Error("About is not configured");
      return toAbout(item);
    },
    async upsertAbout(values: Partial<AboutFormData>, expectedRevision?: number) {
      await upsertSingleton(SECTION.about, values, expectedRevision);
    },

    // Experience
    async getExperience() {
      const items = await listItems(tables.experience);
      return sortExperienceByRecencyDesc(items.map(toExperience));
    },
    async getExperienceById(id: string) {
      const item = await getItem(tables.experience, { id });
      if (!item) throw new Error(`Experience not found: ${id}`);
      return toExperience(item);
    },
    async insertExperience(values: ExperienceFormData) {
      const row = insertRow(values);
      await putItem(tables.experience, row);
      return toExperience(row);
    },
    async updateExperience(
      id: string,
      values: Partial<ExperienceFormData>,
      expectedRevision?: number,
    ) {
      await patchRow(tables.experience, id, "Experience", values, expectedRevision);
    },
    async deleteExperience(id: string) {
      await deleteItem(tables.experience, { id });
    },

    // Projects
    async getProjects() {
      const items = await listItems(tables.project);
      return items.map(toProject).sort((a, b) => a.sort_order - b.sort_order);
    },
    async getFeaturedProjects() {
      const items = await listItems(tables.project);
      return items
        .map(toProject)
        .filter((p) => p.is_featured)
        .sort((a, b) => a.sort_order - b.sort_order);
    },
    async getProjectById(id: string) {
      const item = await getItem(tables.project, { id });
      if (!item) throw new Error(`Project not found: ${id}`);
      return toProject(item);
    },
    async getProjectBySlug(slug: string) {
      const { Items: items } = await client.send(
        new QueryCommand({
          TableName: tables.project,
          IndexName: "by-slug",
          KeyConditionExpression: "slug = :slug",
          ExpressionAttributeValues: { ":slug": slug },
        }),
      );
      const first = items?.[0];
      return first ? toProject(first) : null;
    },
    async insertProject(values: ProjectFormData) {
      const row = insertRow(values);
      await putItem(tables.project, row);
      return toProject(row);
    },
    async updateProject(
      id: string,
      values: Partial<ProjectFormData>,
      expectedRevision?: number,
    ) {
      await patchRow(tables.project, id, "Project", values, expectedRevision);
    },
    async deleteProject(id: string) {
      await deleteItem(tables.project, { id });
    },

    // Skills
    async getSkills() {
      const items = await listItems(tables.skill);
      return items
        .map(toSkill)
        .sort(
          (a, b) => a.category.localeCompare(b.category) || a.sort_order - b.sort_order,
        );
    },
    async upsertSkill(values: SkillUpsert) {
      const { id, ...rest } = values;
      if (id) {
        await patchRow(tables.skill, id, "Skill", rest);
      } else {
        await putItem(tables.skill, insertRow(rest));
      }
    },
    async batchUpsertSkills(rows: SkillUpsert[]) {
      for (const row of rows) {
        await this.upsertSkill(row);
      }
    },
    async deleteSkill(id: string) {
      await deleteItem(tables.skill, { id });
    },

    // Testimonials
    async getTestimonials() {
      const items = await listItems(tables.testimonial);
      return sortRecommendationsByDateDesc(items.map(toTestimonial));
    },
    async insertTestimonial(values: TestimonialFormData) {
      const row = insertRow(values);
      await putItem(tables.testimonial, row);
      return toTestimonial(row);
    },
    async updateTestimonial(
      id: string,
      values: Partial<TestimonialFormData>,
      expectedRevision?: number,
    ) {
      await patchRow(tables.testimonial, id, "Testimonial", values, expectedRevision);
    },
    async deleteTestimonial(id: string) {
      await deleteItem(tables.testimonial, { id });
    },

    // Site config
    async getSiteConfig() {
      const item = await getItem(tables.content, { section: SECTION.siteConfig });
      if (!item) throw new Error("Site config is not configured");
      return toSiteConfig(item);
    },
    async upsertSiteConfig(
      values: Partial<SiteConfigFormData>,
      expectedRevision?: number,
    ) {
      await upsertSingleton(SECTION.siteConfig, values, expectedRevision);
    },

    // Resume
    async getResume() {
      const item = await getItem(tables.content, { section: SECTION.resume });
      if (!item) throw new Error("Resume is not configured");
      return toResume(item);
    },
    async upsertResume(values: Partial<ResumeFormData>, expectedRevision?: number) {
      const sanitized: WriteValues = { ...values };
      if (values.education) sanitized.education = stripNullUrl(values.education);
      if (values.certifications) {
        sanitized.certifications = stripNullUrl(values.certifications);
      }
      await upsertSingleton(SECTION.resume, sanitized, expectedRevision);
    },

    // Resume variants
    async getResumeVariants() {
      const items = await listItems(tables.resumeVariant);
      return items.map(toResumeVariant);
    },
    async getResumeVariantById(id: string) {
      const item = await getItem(tables.resumeVariant, { id });
      return item ? toResumeVariant(item) : null;
    },
    async insertResumeVariant(values: ResumeVariantFormData) {
      const row = insertRow(values);
      await putItem(tables.resumeVariant, row);
      return toResumeVariant(row);
    },
    async updateResumeVariant(
      id: string,
      values: Partial<ResumeVariantFormData>,
      expectedRevision?: number,
    ) {
      await patchRow(tables.resumeVariant, id, "ResumeVariant", values, expectedRevision);
    },
    async deleteResumeVariant(id: string) {
      await deleteItem(tables.resumeVariant, { id });
    },

    // Resume layouts
    async getResumeLayouts() {
      const items = await listItems(tables.resumeLayout);
      return items.map(toResumeLayout).sort((a, b) => a.name.localeCompare(b.name));
    },
    async getResumeLayoutById(id: string) {
      const item = await getItem(tables.resumeLayout, { id });
      return item ? toResumeLayout(item) : null;
    },
    async insertResumeLayout(values: ResumeLayoutFormData) {
      const row = insertRow(values);
      await putItem(tables.resumeLayout, row);
      return toResumeLayout(row);
    },
    async updateResumeLayout(
      id: string,
      values: Partial<ResumeLayoutFormData>,
      expectedRevision?: number,
    ) {
      await patchRow(tables.resumeLayout, id, "ResumeLayout", values, expectedRevision);
    },
    async deleteResumeLayout(id: string) {
      await deleteItem(tables.resumeLayout, { id });
    },

    // Media
    async getMedia() {
      const items = await listItems(tables.media);
      return items
        .map(toMedia)
        .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));
    },
    async getMediaById(id: string) {
      const item = await getItem(tables.media, { id });
      if (!item) throw new Error(`Media not found: ${id}`);
      return toMedia(item);
    },
    async insertMedia(values: MediaInsert) {
      const row: Item = {
        id: randomUUID(),
        filename: values.filename,
        url: values.url,
        mime_type: values.mime_type,
        size: values.size,
        uploaded_at: now(),
        ...(values.alt_text != null ? { alt_text: values.alt_text } : {}),
      };
      await putItem(tables.media, row);
      return toMedia(row);
    },
    async deleteMediaRow(id: string) {
      await deleteItem(tables.media, { id });
    },

    // Resume generations (AI history)
    async insertResumeGeneration(values: ResumeGenerationInsert) {
      const row = { ...insertRow(values), recent_pk: RESUME_GENERATION_RECENT_PK };
      await putItem(tables.resumeGeneration, row);
      return toResumeGeneration(row);
    },
    async updateResumeGeneration(
      id: string,
      values: ResumeGenerationUpdate,
      expectedRevision?: number,
    ) {
      await patchRow(
        tables.resumeGeneration,
        id,
        "ResumeGeneration",
        values,
        expectedRevision,
      );
    },
    async getResumeGenerations(options: ResumeGenerationListOptions = {}) {
      const limit = options.limit ?? 20;
      // Newest-first via the `recent` GSI; page only until we have `limit`
      // non-deleted rows (soft-deletes are filtered after the bounded read).
      const collected: ResumeGeneration[] = [];
      let cursor: Item | undefined;
      do {
        const page = await client.send(
          new QueryCommand({
            TableName: tables.resumeGeneration,
            IndexName: "recent",
            KeyConditionExpression: "recent_pk = :pk",
            ExpressionAttributeValues: { ":pk": RESUME_GENERATION_RECENT_PK },
            ScanIndexForward: false,
            ExclusiveStartKey: cursor,
          }),
        );
        for (const item of page.Items ?? []) {
          const row = toResumeGeneration(item);
          if (options.includeDeleted || row.deleted_at === null) {
            collected.push(row);
            if (collected.length >= limit) return collected;
          }
        }
        cursor = page.LastEvaluatedKey;
      } while (cursor);
      return collected;
    },
    async getResumeGenerationById(id: string) {
      const item = await getItem(tables.resumeGeneration, { id });
      return item ? toResumeGeneration(item) : null;
    },
    async sumDailyUsage(userId: string, windowHours = 24): Promise<UsageSummary> {
      const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
      const { Items: items } = await client.send(
        new QueryCommand({
          TableName: tables.resumeGeneration,
          IndexName: "by-user",
          KeyConditionExpression: "created_by = :u AND created_at >= :since",
          ExpressionAttributeValues: { ":u": userId, ":since": since },
        }),
      );
      const rows = (items ?? [])
        .map(toResumeGeneration)
        .filter((r) => r.deleted_at === null);
      const totalUsd = rows.reduce((sum, r) => sum + (r.usage?.costUsd ?? 0), 0);
      return { totalUsd, count: rows.length };
    },
    async sumMonthlyUsage(userId: string): Promise<UsageSummary> {
      return this.sumDailyUsage(userId, 24 * 30);
    },
  };
}
