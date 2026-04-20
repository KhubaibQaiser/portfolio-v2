import "server-only";
import { anthropic, createAnthropic } from "@ai-sdk/anthropic";
import { groq, createGroq } from "@ai-sdk/groq";

/**
 * Provider factories.
 *
 * In most cases the module-level `anthropic` / `groq` bindings read their
 * API keys from `ANTHROPIC_API_KEY` / `GROQ_API_KEY` at call time. The
 * `createXxx` helpers are re-exported for consumers that want to pass an
 * explicit key (e.g. separate admin vs web keys).
 */

export { anthropic, groq, createAnthropic, createGroq };

export function hasAnthropic(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function hasGroq(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}
