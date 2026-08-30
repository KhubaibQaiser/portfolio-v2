import { generateObject } from "ai";
import { ensureAiApiKeys, modelFor } from "@portfolio/ai";
import { wrapUntrusted } from "@portfolio/ai/guardrails/prompt-injection";
import { sanitizeLlmObject } from "@portfolio/ai/guardrails/output-sanitize";
import { ResumePolicyError } from "@portfolio/ai/policy/resume-generation-policy";
import {
  buildRecruiterMessageSystemPrompt,
  buildRecruiterMessageUserPrompt,
} from "@portfolio/ai/prompts/recruiter-message";
import { recruiterMessageSchema, type RecruiterMessage } from "@portfolio/ai/schemas";
import { loadCandidateFactsUncached } from "@/lib/resume-ai/load-candidate-facts-uncached";
import { prepareJobText } from "@portfolio/ai/matcher/score-job";

function numericClaims(value: string): string[] {
  return value.match(/[$€£]?\d[\d,.]*(?:%|x|k|m|b)?/gi) ?? [];
}

function assertNoInventedMetrics(
  body: string,
  factSheet: string,
  extras: string[],
): void {
  const sourceNumbers = new Set(
    numericClaims([factSheet, ...extras].join(" ")).map((value) =>
      value.toLocaleLowerCase(),
    ),
  );
  const unsupported = numericClaims(body).filter(
    (value) => !sourceNumbers.has(value.toLocaleLowerCase()),
  );
  if (unsupported.length > 0) {
    throw new ResumePolicyError([
      `recruiter message adds unsupported numeric claims: ${unsupported.join(", ")}`,
    ]);
  }
}

export async function generateRecruiterMessage(input: {
  jdText: string;
  company: string;
  role: string;
}): Promise<RecruiterMessage> {
  await ensureAiApiKeys("fast");
  const facts = await loadCandidateFactsUncached();
  const wrapped = wrapUntrusted(prepareJobText(input.jdText));
  const resolved = modelFor("fast");
  const generated = await generateObject({
    model: resolved.model,
    schema: recruiterMessageSchema,
    system: buildRecruiterMessageSystemPrompt(facts, {
      company: input.company,
      role: input.role,
    }),
    prompt: buildRecruiterMessageUserPrompt(wrapped),
    temperature: 0.4,
    maxOutputTokens: 600,
  });
  const parsed = recruiterMessageSchema.parse(sanitizeLlmObject(generated.object));
  assertNoInventedMetrics(parsed.body, facts.factSheet, [input.company, input.role]);
  return parsed;
}

export function formatRecruiterMessage(message: RecruiterMessage): string {
  return `${message.subject}\n\n${message.body}`.slice(0, 800);
}
