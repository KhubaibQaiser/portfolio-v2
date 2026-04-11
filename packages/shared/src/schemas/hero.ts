import { z } from "zod";

export const heroSchema = z.object({
  greeting: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  headline: z.string().min(1).max(200),
  subtitle: z.array(z.string().min(1)).min(1).max(5),
  value_proposition: z.string().min(1).max(300),
  cta_primary_text: z.string().min(1).max(50),
  cta_secondary_text: z.string().min(1).max(50),
});

export type HeroFormData = z.infer<typeof heroSchema>;

export const heroRowSchema = heroSchema.extend({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Hero = z.infer<typeof heroRowSchema>;
