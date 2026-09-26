import { z } from "zod";

export const locationTypeEnum = z.enum(["remote", "onsite", "hybrid"]);

export const contractTypeEnum = z.enum([
  "full_time",
  "part_time",
  "contract",
  "consultant",
  "freelance",
  "internship",
]);

export type ContractType = z.infer<typeof contractTypeEnum>;

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  consultant: "Consultant",
  freelance: "Freelance",
  internship: "Internship",
};

export function getContractTypeLabel(value: ContractType | string): string {
  return CONTRACT_TYPE_LABELS[value as ContractType] ?? value;
}

export const experienceSchema = z.object({
  company: z.string().min(1).max(100),
  role: z.string().min(1).max(150),
  location: z.string().min(1).max(100),
  location_type: locationTypeEnum,
  contract_type: contractTypeEnum,
  start_date: z.string().min(1),
  end_date: z.string().nullable(),
  description: z.string().min(1).max(10000),
  tech_tags: z.array(z.string().min(1)).min(1),
  logo_url: z.string().url().nullable(),
  company_url: z.string().url().nullable(),
  sort_order: z.number().int().min(0),
  show_in_resume: z.boolean().default(true),
  /** Public site only. MCP tools and the admin list still return the row. */
  show_on_site: z.boolean().default(true),
});

/** Resume pipelines only — the public site and admin list show rows independently. */
export function filterExperienceForResume<T extends { show_in_resume?: boolean }>(
  rows: T[],
): T[] {
  return rows.filter((e) => e.show_in_resume !== false);
}

/**
 * Public site only. Drops a role (and any company derived only from it) from
 * pages, sections, and computed stats. MCP reads stay unfiltered.
 */
export function filterExperienceForSite<T extends { show_on_site?: boolean }>(
  rows: T[],
): T[] {
  return rows.filter((e) => e.show_on_site !== false);
}

export type ExperienceFormData = z.infer<typeof experienceSchema>;

export const experienceRowSchema = experienceSchema.extend({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  revision: z.number().int().min(1).default(1),
});

export type Experience = z.infer<typeof experienceRowSchema>;
