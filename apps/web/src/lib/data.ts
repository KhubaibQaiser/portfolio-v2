import { unstable_cache as cache } from "next/cache";
import { supabase } from "@/lib/supabase-server";
import {
  getHero,
  getAbout,
  getExperience,
  getFeaturedProjects,
  getProjects,
  getSkills,
  getTestimonials,
  getSiteConfig,
  getResume,
} from "@portfolio/shared/supabase/queries";

// ---------------------------------------------------------------------------
// All data is loaded from Supabase (see lib/supabase-server). These are
// unstable_cache wrappers keyed by tag; the admin app calls POST /api/revalidate
// (revalidateTag + revalidatePath layout) so updates appear immediately.
// ---------------------------------------------------------------------------

export const fetchHero = cache(
  async () => getHero(supabase),
  ["hero"],
  { tags: ["hero"] },
);

export const fetchAbout = cache(
  async () => getAbout(supabase),
  ["about"],
  { tags: ["about"] },
);

export const fetchExperience = cache(
  async () => getExperience(supabase),
  ["experience"],
  { tags: ["experience"] },
);

export const fetchFeaturedProjects = cache(
  async () => getFeaturedProjects(supabase),
  ["featured-projects"],
  { tags: ["projects"] },
);

export const fetchAllProjects = cache(
  async () => getProjects(supabase),
  ["all-projects"],
  { tags: ["projects"] },
);

export const fetchSkills = cache(
  async () => getSkills(supabase),
  ["skills"],
  { tags: ["skills"] },
);

export const fetchTestimonials = cache(
  async () => getTestimonials(supabase),
  ["testimonials"],
  { tags: ["testimonials"] },
);

export const fetchSiteConfig = cache(
  async () => getSiteConfig(supabase),
  ["site-config"],
  { tags: ["site-config"] },
);

export const fetchResume = cache(
  async () => getResume(supabase),
  ["resume"],
  { tags: ["resume"] },
);
