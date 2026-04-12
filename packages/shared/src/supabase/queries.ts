import type { SupabaseClient } from "@supabase/supabase-js";
import { sortExperienceByRecencyDesc } from "../experience-dates";
import { uniqueCompanyCount } from "../experience-stats";
import type { Database } from "./database.types";

type Client = SupabaseClient<Database>;
type Tables = Database["public"]["Tables"];

// ---------------------------------------------------------------------------
// Hero (singleton)
// ---------------------------------------------------------------------------

export async function getHero(client: Client) {
  const { data, error } = await client.from("hero").select("*").single();
  if (error) throw error;
  return data;
}

export async function upsertHero(client: Client, values: Tables["hero"]["Update"]) {
  const existing = await client.from("hero").select("id").maybeSingle();
  if (existing.data) {
    const { error } = await client.from("hero").update(values).eq("id", existing.data.id);
    if (error) throw error;
  } else {
    const { error } = await client.from("hero").insert(values as Tables["hero"]["Insert"]);
    if (error) throw error;
  }
}

// ---------------------------------------------------------------------------
// About (singleton)
// ---------------------------------------------------------------------------

export async function getAbout(client: Client) {
  const { data, error } = await client.from("about").select("*").single();
  if (error) throw error;
  return data;
}

export async function upsertAbout(client: Client, values: Tables["about"]["Update"]) {
  const existing = await client.from("about").select("id").maybeSingle();
  if (existing.data) {
    const { error } = await client.from("about").update(values).eq("id", existing.data.id);
    if (error) throw error;
  } else {
    const { error } = await client.from("about").insert(values as Tables["about"]["Insert"]);
    if (error) throw error;
  }
}

/** Keeps `about.companies_count` aligned with unique companies in `experience`. */
export async function syncCompaniesCountFromExperience(client: Client) {
  const rows = await getExperience(client);
  const count = uniqueCompanyCount(rows);
  const existing = await client.from("about").select("id").maybeSingle();
  if (!existing.data) return;
  const { error } = await client
    .from("about")
    .update({ companies_count: count })
    .eq("id", existing.data.id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Experience
// ---------------------------------------------------------------------------

export async function getExperience(client: Client) {
  const { data, error } = await client.from("experience").select("*");
  if (error) throw error;
  return sortExperienceByRecencyDesc(data);
}

export async function getExperienceById(client: Client, id: string) {
  const { data, error } = await client.from("experience").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function insertExperience(client: Client, values: Tables["experience"]["Insert"]) {
  const { data, error } = await client.from("experience").insert(values).select().single();
  if (error) throw error;
  return data;
}

export async function updateExperience(client: Client, id: string, values: Tables["experience"]["Update"]) {
  const { error } = await client.from("experience").update(values).eq("id", id);
  if (error) throw error;
}

export async function deleteExperience(client: Client, id: string) {
  const { error } = await client.from("experience").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function getProjects(client: Client) {
  const { data, error } = await client
    .from("projects")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return data;
}

export async function getFeaturedProjects(client: Client) {
  const { data, error } = await client
    .from("projects")
    .select("*")
    .eq("is_featured", true)
    .order("sort_order");
  if (error) throw error;
  return data;
}

export async function getProjectById(client: Client, id: string) {
  const { data, error } = await client.from("projects").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function insertProject(client: Client, values: Tables["projects"]["Insert"]) {
  const { data, error } = await client.from("projects").insert(values).select().single();
  if (error) throw error;
  return data;
}

export async function updateProject(client: Client, id: string, values: Tables["projects"]["Update"]) {
  const { error } = await client.from("projects").update(values).eq("id", id);
  if (error) throw error;
}

export async function deleteProject(client: Client, id: string) {
  const { error } = await client.from("projects").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

export async function getSkills(client: Client) {
  const { data, error } = await client
    .from("skills")
    .select("*")
    .order("category")
    .order("sort_order");
  if (error) throw error;
  return data;
}

export async function upsertSkill(client: Client, id: string | undefined, values: Tables["skills"]["Insert"]) {
  if (id) {
    const { error } = await client.from("skills").update(values).eq("id", id);
    if (error) throw error;
  } else {
    const { error } = await client.from("skills").insert(values);
    if (error) throw error;
  }
}

export async function deleteSkill(client: Client, id: string) {
  const { error } = await client.from("skills").delete().eq("id", id);
  if (error) throw error;
}

export async function batchUpsertSkills(
  client: Client,
  skills: Array<{ id?: string } & Tables["skills"]["Insert"]>,
) {
  const toInsert = skills.filter((s) => !s.id).map(({ id: _, ...rest }) => rest);
  const toUpdate = skills.filter((s) => !!s.id);

  if (toInsert.length > 0) {
    const { error } = await client.from("skills").insert(toInsert);
    if (error) throw error;
  }

  for (const skill of toUpdate) {
    const { id, ...values } = skill;
    const { error } = await client.from("skills").update(values).eq("id", id!);
    if (error) throw error;
  }
}

// ---------------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------------

export async function getTestimonials(client: Client) {
  const { data, error } = await client
    .from("testimonials")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return data;
}

export async function insertTestimonial(client: Client, values: Tables["testimonials"]["Insert"]) {
  const { data, error } = await client.from("testimonials").insert(values).select().single();
  if (error) throw error;
  return data;
}

export async function updateTestimonial(client: Client, id: string, values: Tables["testimonials"]["Update"]) {
  const { error } = await client.from("testimonials").update(values).eq("id", id);
  if (error) throw error;
}

export async function deleteTestimonial(client: Client, id: string) {
  const { error } = await client.from("testimonials").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Site Config (singleton)
// ---------------------------------------------------------------------------

export async function getSiteConfig(client: Client) {
  const { data, error } = await client.from("site_config").select("*").single();
  if (error) throw error;
  return data;
}

export async function upsertSiteConfig(client: Client, values: Tables["site_config"]["Update"]) {
  const existing = await client.from("site_config").select("id").maybeSingle();
  if (existing.data) {
    const { error } = await client.from("site_config").update(values).eq("id", existing.data.id);
    if (error) throw error;
  } else {
    const { error } = await client.from("site_config").insert(values as Tables["site_config"]["Insert"]);
    if (error) throw error;
  }
}

// ---------------------------------------------------------------------------
// Resume (singleton)
// ---------------------------------------------------------------------------

export async function getResume(client: Client) {
  const { data, error } = await client.from("resume").select("*").single();
  if (error) throw error;
  return data;
}

export async function upsertResume(client: Client, values: Tables["resume"]["Update"]) {
  const existing = await client.from("resume").select("id").maybeSingle();
  if (existing.data) {
    const { error } = await client.from("resume").update(values).eq("id", existing.data.id);
    if (error) throw error;
  } else {
    const { error } = await client.from("resume").insert(values as Tables["resume"]["Insert"]);
    if (error) throw error;
  }
}
