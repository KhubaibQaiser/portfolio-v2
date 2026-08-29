import { z } from "zod";

export const recruiterMessageSchema = z
  .object({
    subject: z
      .string()
      .min(4)
      .max(120)
      .describe("Email/LinkedIn subject. No invented company or role names."),
    body: z
      .string()
      .min(40)
      .max(800)
      .describe("500-800 character recruiter note. First person. No invented metrics."),
  })
  .strict();

export type RecruiterMessage = z.infer<typeof recruiterMessageSchema>;
