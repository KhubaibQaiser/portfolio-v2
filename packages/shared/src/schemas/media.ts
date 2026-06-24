import { z } from "zod";

/** Validates a row to insert into the media collection after upload. */
export const mediaInsertSchema = z.object({
  filename: z.string().min(1).max(500),
  url: z.string().url(),
  mime_type: z.string().min(1).max(200),
  size: z.number().int().nonnegative(),
  alt_text: z.string().max(500).nullable().optional(),
});

export type MediaInsert = z.infer<typeof mediaInsertSchema>;

/** A stored media asset. */
export const mediaRowSchema = z.object({
  id: z.string(),
  filename: z.string(),
  url: z.string(),
  mime_type: z.string(),
  size: z.number().int().nonnegative(),
  alt_text: z.string().nullable(),
  uploaded_at: z.string(),
});

export type Media = z.infer<typeof mediaRowSchema>;
