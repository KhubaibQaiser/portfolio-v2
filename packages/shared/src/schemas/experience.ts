import { z } from "zod";

export const locationTypeEnum = z.enum(["remote", "onsite", "hybrid"]);

export const contractTypeEnum = z.enum([
  "full_time",
  "part_time",
  "contract",
  "freelance",
  "internship",
]);

export type ContractType = z.infer<typeof contractTypeEnum>;

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
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
});

export type ExperienceFormData = z.infer<typeof experienceSchema>;

export const experienceRowSchema = experienceSchema.extend({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Experience = z.infer<typeof experienceRowSchema>;
