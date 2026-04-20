import { z } from "zod";

export const educationSchema = z.object({
  degree: z.string().min(1),
  institution: z.string().min(1),
  year: z.string().min(1),
  url: z.string().url().nullable(),
});

export type Education = z.infer<typeof educationSchema>;

export const certificationSchema = z.object({
  name: z.string().min(1),
  issuer: z.string().min(1),
  url: z.string().url().nullable(),
});

export type Certification = z.infer<typeof certificationSchema>;

export const resumeSchema = z.object({
  default_summary: z.string().min(1).max(2000),
  education: z.array(educationSchema).min(1),
  certifications: z.array(certificationSchema),
  visible_sections: z.array(z.string()),
  is_projects_visible: z.boolean(),
  voice_sample: z.string().max(3000).nullable().optional(),
});

export type ResumeFormData = z.infer<typeof resumeSchema>;

export const resumeRowSchema = resumeSchema.extend({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Resume = z.infer<typeof resumeRowSchema>;

export const resumeVariantSchema = z.object({
  name: z.string().min(1).max(100),
  summary_override: z.string().nullable(),
  hidden_experience_ids: z.array(z.string()),
  hidden_skill_ids: z.array(z.string()),
});

export const resumeVariantRowSchema = resumeVariantSchema.extend({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ResumeVariant = z.infer<typeof resumeVariantRowSchema>;
