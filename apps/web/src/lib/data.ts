import { unstable_cache as cache } from "next/cache";
import { createClient } from "@/lib/supabase-server";
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
// Cache wrappers — data is cached per-request on the edge and invalidated
// via revalidateTag("hero") etc. from the admin server actions.
// ---------------------------------------------------------------------------

export const fetchHero = cache(
  async () => {
    const client = await createClient();
    return getHero(client);
  },
  ["hero"],
  { tags: ["hero"] },
);

export const fetchAbout = cache(
  async () => {
    const client = await createClient();
    return getAbout(client);
  },
  ["about"],
  { tags: ["about"] },
);

export const fetchExperience = cache(
  async () => {
    const client = await createClient();
    return getExperience(client);
  },
  ["experience"],
  { tags: ["experience"] },
);

export const fetchFeaturedProjects = cache(
  async () => {
    const client = await createClient();
    return getFeaturedProjects(client);
  },
  ["featured-projects"],
  { tags: ["projects"] },
);

export const fetchAllProjects = cache(
  async () => {
    const client = await createClient();
    return getProjects(client);
  },
  ["all-projects"],
  { tags: ["projects"] },
);

export const fetchSkills = cache(
  async () => {
    const client = await createClient();
    return getSkills(client);
  },
  ["skills"],
  { tags: ["skills"] },
);

export const fetchTestimonials = cache(
  async () => {
    const client = await createClient();
    return getTestimonials(client);
  },
  ["testimonials"],
  { tags: ["testimonials"] },
);

export const fetchSiteConfig = cache(
  async () => {
    const client = await createClient();
    return getSiteConfig(client);
  },
  ["site-config"],
  { tags: ["site-config"] },
);

export const fetchResume = cache(
  async () => {
    const client = await createClient();
    return getResume(client);
  },
  ["resume"],
  { tags: ["resume"] },
);
