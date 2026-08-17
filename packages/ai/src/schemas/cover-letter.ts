import { z } from "zod";

export const coverLetterSchema = z.object({
  greeting: z
    .string()
    .min(2)
    .max(120)
    .describe(
      "Salutation, e.g. 'Dear {Hiring Manager},' or 'Dear Alex,'. Placeholders stay in curly braces when the name is unknown.",
    ),
  body: z
    .array(z.string().min(20).max(900))
    .min(1)
    .max(5)
    .describe("1-2 short paragraphs preferred. Each 20-900 chars. No AI cliches, no triples."),
  closing: z.string().min(10).max(300).describe("Closing paragraph inviting next steps."),
  signOff: z
    .string()
    .min(2)
    .max(60)
    .describe("Sign-off + name, e.g. 'Best regards,\\nKhubaib Qaiser'."),
});

export type CoverLetter = z.infer<typeof coverLetterSchema>;
