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
// Media
// ---------------------------------------------------------------------------

export async function deleteMediaAsset(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const row = await repo.getMediaById(id);
    const { getMediaStore } = await import("@portfolio/data/media");
    const mediaStore = await getMediaStore();
    if (mediaStore.isConfigured()) {
      const key = mediaStore.publicUrlToObjectKey(row.url);
      if (key) await mediaStore.deleteObject(key);
    }
    await repo.deleteMediaRow(id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
