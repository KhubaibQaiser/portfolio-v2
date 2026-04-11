"use server";

import { createClient } from "@/lib/supabase/server";
import {
  upsertHero,
  upsertAbout,
  insertExperience,
  updateExperience,
  deleteExperience as deleteExp,
  insertProject,
  updateProject,
  deleteProject as deleteProj,
  batchUpsertSkills,
  deleteSkill as deleteSk,
  insertTestimonial,
  updateTestimonial,
  deleteTestimonial as deleteTest,
  upsertSiteConfig,
  upsertResume,
} from "@portfolio/shared/supabase/queries";
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

// ---------------------------------------------------------------------------
// Revalidation helper
// ---------------------------------------------------------------------------

async function revalidateWeb(tags: string[]) {
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!webUrl || !secret) return;

  try {
    await fetch(`${webUrl}/api/revalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-secret": secret,
      },
      body: JSON.stringify({ tags }),
    });
  } catch {
    // Revalidation failure should not block admin save
  }
}

type ActionResult = { success: true } | { success: false; error: string };

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

export async function saveHero(values: z.infer<typeof heroSchema>): Promise<ActionResult> {
  const parsed = heroSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    const client = await createClient();
    await upsertHero(client, parsed.data);
    await revalidateWeb(["hero"]);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ---------------------------------------------------------------------------
// About
// ---------------------------------------------------------------------------

export async function saveAbout(values: z.infer<typeof aboutSchema>): Promise<ActionResult> {
  const parsed = aboutSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    const client = await createClient();
    await upsertAbout(client, parsed.data);
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
  const parsed = experienceSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    const client = await createClient();
    if (id) {
      await updateExperience(client, id, parsed.data);
    } else {
      await insertExperience(client, parsed.data);
    }
    await revalidateWeb(["experience"]);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function deleteExperience(id: string): Promise<ActionResult> {
  try {
    const client = await createClient();
    await deleteExp(client, id);
    await revalidateWeb(["experience"]);
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
  const parsed = projectSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    const client = await createClient();
    if (id) {
      await updateProject(client, id, parsed.data);
    } else {
      await insertProject(client, parsed.data);
    }
    await revalidateWeb(["projects"]);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function deleteProject(id: string): Promise<ActionResult> {
  try {
    const client = await createClient();
    await deleteProj(client, id);
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
  for (const skill of skills) {
    const parsed = skillSchema.safeParse(skill);
    if (!parsed.success) return { success: false, error: `Invalid skill "${skill.name}": ${parsed.error.message}` };
  }

  try {
    const client = await createClient();
    await batchUpsertSkills(client, skills);
    await revalidateWeb(["skills"]);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function deleteSkill(id: string): Promise<ActionResult> {
  try {
    const client = await createClient();
    await deleteSk(client, id);
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
  const parsed = testimonialSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    const client = await createClient();
    if (id) {
      await updateTestimonial(client, id, parsed.data);
    } else {
      await insertTestimonial(client, parsed.data);
    }
    await revalidateWeb(["testimonials"]);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function deleteTestimonialAction(id: string): Promise<ActionResult> {
  try {
    const client = await createClient();
    await deleteTest(client, id);
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
  const parsed = siteConfigSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    const client = await createClient();
    await upsertSiteConfig(client, parsed.data);
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
  const normalized = {
    ...values,
    education: values.education.map((e) => ({
      ...e,
      url:
        e.url != null && String(e.url).trim() !== ""
          ? String(e.url).trim()
          : null,
    })),
    certifications: values.certifications.map((c) => ({
      ...c,
      url:
        c.url != null && String(c.url).trim() !== ""
          ? String(c.url).trim()
          : null,
    })),
  };

  const parsed = resumeSchema.safeParse(normalized);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    const client = await createClient();
    await upsertResume(client, parsed.data);
    await revalidateWeb(["resume"]);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
