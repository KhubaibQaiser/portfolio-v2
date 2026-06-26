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
import { revalidateWeb } from "@/lib/revalidate-web";
import { requireAdmin } from "@/lib/auth-guard";

type ActionResult = { success: true } | { success: false; error: string };

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
    await revalidateWeb(["hero"]);
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
    await revalidateWeb(["about"]);
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
    // The public "companies" stat is derived from Experience at read time, so
    // revalidate About too — no stored count to sync.
    await revalidateWeb(["experience", "about"]);
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
    await revalidateWeb(["experience", "about"]);
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
    await revalidateWeb(["projects"]);
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
    await revalidateWeb(["projects"]);
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
    await revalidateWeb(["skills"]);
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
    await revalidateWeb(["skills"]);
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
    await revalidateWeb(["testimonials"]);
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
    await revalidateWeb(["testimonials"]);
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
    await revalidateWeb(["site-config"]);
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
    await revalidateWeb(["resume"]);
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
    // Lazy import so the S3 SDK isn't pulled into every editor page that imports
    // these server actions (it lives in @portfolio/data/media for that reason).
    const { getMediaStore } = await import("@portfolio/data/media");
    const mediaStore = getMediaStore();
    if (mediaStore.isConfigured()) {
      const key = mediaStore.publicUrlToObjectKey(row.url);
      if (key) await mediaStore.deleteObject(key);
    }
    await repo.deleteMediaRow(id);
    await revalidateWeb(["media"]);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
