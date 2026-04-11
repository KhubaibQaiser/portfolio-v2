import { z } from "zod";

export const blogPostSchema = z.object({
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(300),
  excerpt: z.string().min(1).max(500),
  content: z.string().min(1),
  cover_image_url: z.string().url().nullable(),
  tags: z.array(z.string().min(1)),
  published: z.boolean(),
  published_at: z.string().nullable(),
  reading_time_minutes: z.number().int().min(1),
});

export type BlogPostFormData = z.infer<typeof blogPostSchema>;

export const blogPostRowSchema = blogPostSchema.extend({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type BlogPost = z.infer<typeof blogPostRowSchema>;
