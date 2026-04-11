import { z } from "zod";

export const testimonialSchema = z.object({
  quote: z.string().min(1).max(2000),
  author_name: z.string().min(1).max(100),
  author_title: z.string().min(1).max(150),
  company: z.string().min(1).max(100),
  avatar_url: z.string().url().nullable(),
  sort_order: z.number().int().min(0),
});

export type TestimonialFormData = z.infer<typeof testimonialSchema>;

export const testimonialRowSchema = testimonialSchema.extend({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Testimonial = z.infer<typeof testimonialRowSchema>;
