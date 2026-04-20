import { z } from "zod";

export const coverLetterSchema = z.object({
  greeting: z
    .string()
    .min(2)
    .max(120)
    .describe(
      "Salutation, e.g. 'Dear Hiring Manager,' or 'Dear {name},'. Language-matched.",
    ),
  body: z
    .array(z.string().min(40).max(900))
    .min(2)
    .max(5)
    .describe(
      "Paragraphs. Each 40-900 chars. No AI cliches, no triples, vary sentence length.",
    ),
  closing: z
    .string()
    .min(10)
    .max(300)
    .describe("Closing paragraph inviting next steps."),
  signOff: z
    .string()
    .min(2)
    .max(60)
    .describe("Sign-off + name, e.g. 'Best regards,\\nKhubaib Qaiser'."),
});

export type CoverLetter = z.infer<typeof coverLetterSchema>;
