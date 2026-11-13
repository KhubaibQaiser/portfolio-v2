import { z } from "zod";

export const projectTypeEnum = z.enum(["web", "mobile", "game", "open-source", "other"]);

export type ProjectType = z.infer<typeof projectTypeEnum>;

export const projectStatusEnum = z.enum(["draft", "published"]);

export type ProjectStatus = z.infer<typeof projectStatusEnum>;

export const projectSchema = z.object({
  title: z.string().min(1).max(150),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().min(1).max(10000),
  summary: z.string().min(1).max(300),
  cover_url: z.string().url().nullable(),
  tech_tags: z.array(z.string().min(1)).min(1),
  role: z.string().min(1).max(150),
  type: projectTypeEnum,
  github_url: z.string().url().nullable(),
  live_url: z.string().url().nullable(),
  playstore_url: z.string().url().nullable(),
  appstore_url: z.string().url().nullable(),
  is_featured: z.boolean(),
  sort_order: z.number().int().min(0),
  show_in_resume: z.boolean().default(false),
  resume_status: z.string().max(80).nullable().default(null),
  /** Newline-separated bullets for the resume PDF (portfolio description stays separate). */
  resume_description: z.string().max(2000).default(""),
  /** `draft` rows (created via the project MCP) are hidden from every public read until approved in Admin. */
  status: projectStatusEnum.default("published"),
});

/** Rows saved before `status` existed have none; treat them as published. */
export function isPublishedProject(p: { status?: ProjectStatus }): boolean {
  return p.status !== "draft";
}

/** Resume pipelines only — portfolio and admin list show all rows. */
export function filterProjectsForResume<T extends { show_in_resume?: boolean }>(
  rows: T[],
): T[] {
  return rows.filter((p) => p.show_in_resume === true);
}

export type ProjectFormData = z.infer<typeof projectSchema>;

/**
 * Content fields an agent may change on an existing project (ADR 0010). No
 * `slug` (identity), `status`, `sort_order`, `is_featured`, `show_in_resume` or
 * gallery. Link fields cannot be set to null: clearing one is an Admin action.
 */
export const projectContentPatchSchema = z
  .object({
    title: projectSchema.shape.title,
    summary: projectSchema.shape.summary,
    description: projectSchema.shape.description,
    cover_url: z.string().url(),
    tech_tags: projectSchema.shape.tech_tags,
    role: projectSchema.shape.role,
    type: projectTypeEnum,
    github_url: z.string().url(),
    live_url: z.string().url(),
    playstore_url: z.string().url(),
    appstore_url: z.string().url(),
    resume_status: z.string().max(80),
    resume_description: z.string().max(2000),
  })
  .partial()
  .strict();

export type ProjectContentPatch = z.infer<typeof projectContentPatchSchema>;

/** An agent's proposed change to a PUBLISHED project, waiting for Admin approval. */
export const projectPendingRevisionSchema = z.object({
  values: projectContentPatchSchema,
  /** Row `revision` the agent read when it proposed this. */
  base_revision: z.number().int().min(1),
  proposed_at: z.string(),
  /** OAuth client_id of the proposing connector. */
  proposed_by: z.string(),
});

export type ProjectPendingRevision = z.infer<typeof projectPendingRevisionSchema>;

/** Values accepted by `updateProject`; `pending_revision: null` clears it. */
export type ProjectUpdate = Partial<ProjectFormData> & {
  pending_revision?: ProjectPendingRevision | null;
};

/** Public readers must never see staged text (ADR 0010). */
export function withoutPendingRevision<T extends { pending_revision?: unknown }>(
  p: T,
): Omit<T, "pending_revision"> {
  const { pending_revision: _pending, ...rest } = p;
  return rest;
}

export const projectRowSchema = projectSchema.extend({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  revision: z.number().int().min(1).default(1),
  /** Staged agent edit awaiting Admin approval; never exposed by public reads. */
  pending_revision: projectPendingRevisionSchema.optional(),
});

export type Project = z.infer<typeof projectRowSchema>;
