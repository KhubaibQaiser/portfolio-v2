"use server";

import { getContentRepository } from "@portfolio/data";
import { isContentConflictError } from "@portfolio/shared/concurrency";
import { isMediaUrl } from "@portfolio/shared/media-url";
import {
  heroSchema,
  aboutSchema,
  experienceSchema,
  projectSchema,
  skillSchema,
  testimonialSchema,
  siteConfigSchema,
  resumeSchema,
  resumeLayoutSchema,
  classicLayoutForm,
  modernBlueLayoutForm,
  atsResumeLayoutForm,
  cloneLayoutForm,
} from "@portfolio/shared/schemas";
import type { z } from "zod";
import { requireAdmin } from "@/lib/auth-guard";
import { publishContentChanged } from "@/lib/content-publish";

export type ActionResult = { success: true } | { success: false; error: string };

const repo = getContentRepository();

function actionError(error: unknown): ActionResult {
  if (isContentConflictError(error)) {
    return {
      success: false,
      error: "This content changed in another session. Refresh and re-apply your edit.",
    };
  }
  return {
    success: false,
    error: error instanceof Error ? error.message : "Unknown error",
  };
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

export async function saveHero(
  values: z.infer<typeof heroSchema>,
  expectedRevision?: number,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = heroSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    await repo.upsertHero(parsed.data, expectedRevision);
    await publishContentChanged();
    return { success: true };
  } catch (e) {
    return actionError(e);
  }
}

// ---------------------------------------------------------------------------
// About
// ---------------------------------------------------------------------------

export async function saveAbout(
  values: z.infer<typeof aboutSchema>,
  expectedRevision?: number,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = aboutSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    await repo.upsertAbout(parsed.data, expectedRevision);
    await publishContentChanged();
    return { success: true };
  } catch (e) {
    return actionError(e);
  }
}

// ---------------------------------------------------------------------------
// Experience
// ---------------------------------------------------------------------------

export async function saveExperience(
  id: string | null,
  values: z.infer<typeof experienceSchema>,
  expectedRevision?: number,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = experienceSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    if (id) {
      await repo.updateExperience(id, parsed.data, expectedRevision);
    } else {
      await repo.insertExperience(parsed.data);
    }
    await publishContentChanged();
    return { success: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteExperience(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    await repo.deleteExperience(id);
    await publishContentChanged();
    return { success: true };
  } catch (e) {
    return actionError(e);
  }
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function saveProject(
  id: string | null,
  values: z.infer<typeof projectSchema>,
  expectedRevision?: number,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = projectSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  // next/image only allows the media host; reject others here, not at render time.
  // Unset in local dev with no media storage, where there is nothing to compare to.
  const mediaBase = process.env.MEDIA_PUBLIC_BASE_URL;
  if (
    mediaBase &&
    (parsed.data.gallery ?? []).some((image) => !isMediaUrl(image.url, mediaBase))
  ) {
    return { success: false, error: "Gallery images must come from the media library." };
  }

  try {
    if (id) {
      await repo.updateProject(id, parsed.data, expectedRevision);
    } else {
      await repo.insertProject(parsed.data);
    }
    await publishContentChanged();
    return { success: true };
  } catch (e) {
    return actionError(e);
  }
}

/** Publishes a draft (e.g. one proposed through the project MCP). Only an admin can. */
export async function approveProject(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const row = await repo.getProjectById(id);
    if (row.status === "published") return { success: true };
    await repo.updateProject(id, { status: "published" }, row.revision);
    await publishContentChanged();
    return { success: true };
  } catch (e) {
    return actionError(e);
  }
}

/**
 * Applies an agent's staged edit (ADR 0010) to the live row and publishes. Uses
 * the row's current revision, so edits Admin made since the proposal are kept
 * unless the proposal overrides those fields.
 */
export async function approveProjectRevision(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const row = await repo.getProjectById(id);
    if (!row.pending_revision) return { success: true };
    await repo.updateProject(
      id,
      { ...row.pending_revision.values, pending_revision: null },
      row.revision,
    );
    await publishContentChanged();
    return { success: true };
  } catch (e) {
    return actionError(e);
  }
}

/** Discards an agent's staged edit; the live row is unchanged, so nothing to purge. */
export async function rejectProjectRevision(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const row = await repo.getProjectById(id);
    if (!row.pending_revision) return { success: true };
    await repo.updateProject(id, { pending_revision: null }, row.revision);
    return { success: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteProject(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    await repo.deleteProject(id);
    await publishContentChanged();
    return { success: true };
  } catch (e) {
    return actionError(e);
  }
}

// ---------------------------------------------------------------------------
// Skills (batch)
// ---------------------------------------------------------------------------

export async function saveSkills(
  skills: Array<{ id?: string } & z.infer<typeof skillSchema>>,
  deletedIds: string[] = [],
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  for (const skill of skills) {
    const parsed = skillSchema.safeParse(skill);
    if (!parsed.success)
      return {
        success: false,
        error: `Invalid skill "${skill.name}": ${parsed.error.message}`,
      };
  }

  try {
    await repo.batchUpsertSkills(skills);
    for (const id of deletedIds) {
      await repo.deleteSkill(id);
    }
    await publishContentChanged();
    return { success: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteSkill(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    await repo.deleteSkill(id);
    await publishContentChanged();
    return { success: true };
  } catch (e) {
    return actionError(e);
  }
}

// ---------------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------------

export async function saveTestimonial(
  id: string | null,
  values: z.infer<typeof testimonialSchema>,
  expectedRevision?: number,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = testimonialSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    if (id) {
      await repo.updateTestimonial(id, parsed.data, expectedRevision);
    } else {
      await repo.insertTestimonial(parsed.data);
    }
    await publishContentChanged();
    return { success: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteTestimonialAction(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    await repo.deleteTestimonial(id);
    await publishContentChanged();
    return { success: true };
  } catch (e) {
    return actionError(e);
  }
}

// ---------------------------------------------------------------------------
// Site Config
// ---------------------------------------------------------------------------

export async function saveSiteConfig(
  values: z.infer<typeof siteConfigSchema>,
  expectedRevision?: number,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = siteConfigSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    await repo.upsertSiteConfig(parsed.data, expectedRevision);
    await publishContentChanged();
    return { success: true };
  } catch (e) {
    return actionError(e);
  }
}

// ---------------------------------------------------------------------------
// Resume (singleton)
// ---------------------------------------------------------------------------

export async function saveResume(
  values: z.infer<typeof resumeSchema>,
  expectedRevision?: number,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const normalized = {
    ...values,
    education: values.education.map((e) => ({
      ...e,
      url: e.url != null && String(e.url).trim() !== "" ? String(e.url).trim() : null,
    })),
    certifications: values.certifications.map((c) => ({
      ...c,
      url: c.url != null && String(c.url).trim() !== "" ? String(c.url).trim() : null,
    })),
  };

  const parsed = resumeSchema.safeParse(normalized);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    await repo.upsertResume(parsed.data, expectedRevision);
    await publishContentChanged();
    return { success: true };
  } catch (e) {
    return actionError(e);
  }
}

// ---------------------------------------------------------------------------
// Resume layouts
// ---------------------------------------------------------------------------

export async function saveResumeLayout(
  id: string | null,
  values: z.infer<typeof resumeLayoutSchema>,
  expectedRevision?: number,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const normalized = {
    ...values,
    preview_image_url:
      values.preview_image_url != null && String(values.preview_image_url).trim() !== ""
        ? String(values.preview_image_url).trim()
        : null,
  };
  const parsed = resumeLayoutSchema.safeParse(normalized);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    if (id) {
      const current = await repo.getResumeLayoutById(id);
      if (!current) return { success: false, error: "Layout not found" };
      if (current.is_default && parsed.data.is_default === false) {
        return {
          success: false,
          error: "Set another layout as default before unsetting this one.",
        };
      }
      await repo.updateResumeLayout(id, parsed.data, expectedRevision);
      if (parsed.data.is_default) await ensureSingleDefaultLayout(id);
    } else {
      const created = await repo.insertResumeLayout({
        ...parsed.data,
        is_default: false,
      });
      if (parsed.data.is_default) await ensureSingleDefaultLayout(created.id);
    }
    await publishContentChanged();
    return { success: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function createResumeLayoutFromTemplate(
  template: "classic" | "modern-blue" | "ats-resume",
): Promise<ActionResult & { id?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const source =
    template === "ats-resume"
      ? atsResumeLayoutForm()
      : template === "modern-blue"
        ? modernBlueLayoutForm()
        : classicLayoutForm();
  const values = cloneLayoutForm(source, { name: `${source.name} copy` });

  try {
    const created = await repo.insertResumeLayout(values);
    return { success: true, id: created.id };
  } catch (e) {
    return actionError(e);
  }
}

export async function setDefaultResumeLayout(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const current = await repo.getResumeLayoutById(id);
    if (!current) return { success: false, error: "Layout not found" };
    await ensureSingleDefaultLayout(id);
    await publishContentChanged();
    return { success: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteResumeLayout(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const layouts = await repo.getResumeLayouts();
    const current = layouts.find((layout) => layout.id === id);
    if (!current) return { success: false, error: "Layout not found" };
    if (current.is_default) {
      return { success: false, error: "Cannot delete the default layout." };
    }
    if (layouts.length <= 1) {
      return { success: false, error: "Keep at least one layout." };
    }
    await repo.deleteResumeLayout(id);
    await publishContentChanged();
    return { success: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function applyTailoredSummary(summary: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const trimmed = summary.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
  if (trimmed.length < 80) {
    return { success: false, error: "Summary is too short to apply." };
  }
  if (trimmed.length > 450) {
    return { success: false, error: "Summary exceeds 450 characters." };
  }
  if (!/[.!?]["')\]]?$/.test(trimmed)) {
    return { success: false, error: "Summary must end with a complete sentence." };
  }

  try {
    const current = await repo.getResume();
    await repo.upsertResume({ default_summary: trimmed }, current.revision);
    await publishContentChanged();
    return { success: true };
  } catch (e) {
    return actionError(e);
  }
}

async function ensureSingleDefaultLayout(id: string): Promise<void> {
  const layouts = await repo.getResumeLayouts();
  for (const layout of layouts) {
    const shouldBeDefault = layout.id === id;
    if (layout.is_default !== shouldBeDefault) {
      await repo.updateResumeLayout(layout.id, { is_default: shouldBeDefault });
    }
  }
}
