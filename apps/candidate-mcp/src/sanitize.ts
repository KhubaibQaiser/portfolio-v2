import { stripPromptInjection } from "@portfolio/ai/guardrails/prompt-injection";

/**
 * Recursively scrub every string leaf of a value with the same
 * prompt-injection filter the resume-AI pipeline applies to untrusted input
 * (`packages/ai/src/guardrails/prompt-injection.ts`).
 *
 * Every tool response here is free-text profile content that lands directly
 * in a calling agent's LLM context, so this server treats its own output as
 * the untrusted side of that boundary too (see ADR 0003 §"Standing
 * invariants") — a bio, testimonial, or job description pasted into a CMS
 * field is exactly the kind of content the guardrail was built to catch.
 */
export function deepSanitize<T>(value: T): T {
  if (typeof value === "string") {
    return stripPromptInjection(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepSanitize(item)) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = deepSanitize(val);
    }
    return out as T;
  }
  return value;
}
