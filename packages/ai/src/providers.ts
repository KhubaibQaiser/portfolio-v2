import "server-only";
import { anthropic, createAnthropic } from "@ai-sdk/anthropic";
import { groq, createGroq } from "@ai-sdk/groq";

/**
 * Provider factories. Call {@link ensureGroqApiKey} / {@link ensureAnthropicApiKey}
 * (or {@link ensureAiApiKeys}) before model calls so the SDK env vars are set.
 */

export { anthropic, groq, createAnthropic, createGroq };

export function hasAnthropic(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY_SECRET_ARN);
}

export function hasGroq(): boolean {
  return Boolean(process.env.GROQ_API_KEY_SECRET_ARN);
}
