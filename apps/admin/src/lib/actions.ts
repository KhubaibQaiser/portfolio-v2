"use server";

import { getContentRepository } from "@portfolio/data";
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
  cloneLayoutForm,
} from "@portfolio/shared/schemas";
import type { z } from "zod";
import { requireAdmin } from "@/lib/auth-guard";

export type ActionResult = { success: true } | { success: false; error: string };

const repo = getContentRepository();

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

export async function saveHero(
  values: z.infer<typeof heroSchema>,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = heroSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    await repo.upsertHero(parsed.data);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ---------------------------------------------------------------------------
// About
// ---------------------------------------------------------------------------

export async function saveAbout(
  values: z.infer<typeof aboutSchema>,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = aboutSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    await repo.upsertAbout(parsed.data);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ---------------------------------------------------------------------------
// Experience
// ---------------------------------------------------------------------------

export async function saveExperience(
  id: string | null,
  values: z.infer<typeof experienceSchema>,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = experienceSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    if (id) {
      await repo.updateExperience(id, parsed.data);
    } else {
      await repo.insertExperience(parsed.data);
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function deleteExperience(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    await repo.deleteExperience(id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function saveProject(
  id: string | null,
  values: z.infer<typeof projectSchema>,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = projectSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    if (id) {
      await repo.updateProject(id, parsed.data);
    } else {
      await repo.insertProject(parsed.data);
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function deleteProject(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    await repo.deleteProject(id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
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
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function deleteSkill(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    await repo.deleteSkill(id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ---------------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------------

export async function saveTestimonial(
  id: string | null,
  values: z.infer<typeof testimonialSchema>,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = testimonialSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    if (id) {
      await repo.updateTestimonial(id, parsed.data);
    } else {
      await repo.insertTestimonial(parsed.data);
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function deleteTestimonialAction(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    await repo.deleteTestimonial(id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ---------------------------------------------------------------------------
// Site Config
// ---------------------------------------------------------------------------

export async function saveSiteConfig(
  values: z.infer<typeof siteConfigSchema>,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = siteConfigSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    await repo.upsertSiteConfig(parsed.data);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ---------------------------------------------------------------------------
// Resume (singleton)
// ---------------------------------------------------------------------------

export async function saveResume(
  values: z.infer<typeof resumeSchema>,
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
    await repo.upsertResume(parsed.data);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ---------------------------------------------------------------------------
// Resume layouts
// ---------------------------------------------------------------------------

export async function saveResumeLayout(
  id: string | null,
  values: z.infer<typeof resumeLayoutSchema>,
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
      await repo.updateResumeLayout(id, parsed.data);
      if (parsed.data.is_default) await ensureSingleDefaultLayout(id);
    } else {
      const created = await repo.insertResumeLayout({
        ...parsed.data,
        is_default: false,
      });
      if (parsed.data.is_default) await ensureSingleDefaultLayout(created.id);
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function createResumeLayoutFromTemplate(
  template: "classic" | "modern-blue",
): Promise<ActionResult & { id?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const source =
    template === "modern-blue" ? modernBlueLayoutForm() : classicLayoutForm();
  const values = cloneLayoutForm(source, { name: `${source.name} copy` });

  try {
    const created = await repo.insertResumeLayout(values);
    return { success: true, id: created.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function setDefaultResumeLayout(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const current = await repo.getResumeLayoutById(id);
    if (!current) return { success: false, error: "Layout not found" };
    await ensureSingleDefaultLayout(id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
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
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function applyTailoredSummary(summary: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const trimmed = summary.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
  if (trimmed.length < 40) {
    return { success: false, error: "Summary is too short to apply." };
  }
  if (trimmed.length > 2000) {
    return { success: false, error: "Summary exceeds 2000 characters." };
  }

  try {
    await repo.upsertResume({ default_summary: trimmed });
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
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
