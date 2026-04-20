import "server-only";
import type { LanguageModel } from "ai";
import { anthropic, groq } from "./providers";

/**
 * Canonical model ids. Centralized so upgrades happen in one place.
 */
export const MODEL_IDS = {
  anthropicSonnet: "claude-sonnet-4-5",
  anthropicHaiku: "claude-haiku-4-5",
  groqLlama4Scout: "meta-llama/llama-4-scout-17b-16e-instruct",
  groqGptOss120b: "openai/gpt-oss-120b",
  groqLlama8bInstant: "llama-3.1-8b-instant",
} as const;

export type ModelId = (typeof MODEL_IDS)[keyof typeof MODEL_IDS];

export type ModelMode = "quality" | "fast" | "cheap";

export type ResolvedModel = {
  model: LanguageModel;
  modelId: ModelId;
  provider: "anthropic" | "groq";
};

/**
 * Resolve a model for a given use case.
 *
 * - `quality`: best writing/reasoning; Claude Sonnet 4.5 when available,
 *   otherwise falls back to Groq `openai/gpt-oss-120b`.
 * - `fast`:    low-latency draft; Groq Llama 4 Scout.
 * - `cheap`:   tiny/cheap pass (ATS scoring, AI-tone retry); Groq 8B instant.
 */
export function modelFor(mode: ModelMode): ResolvedModel {
  if (mode === "quality") {
    if (process.env.ANTHROPIC_API_KEY) {
      return {
        model: anthropic(MODEL_IDS.anthropicSonnet),
        modelId: MODEL_IDS.anthropicSonnet,
        provider: "anthropic",
      };
    }
    return {
      model: groq(MODEL_IDS.groqGptOss120b),
      modelId: MODEL_IDS.groqGptOss120b,
      provider: "groq",
    };
  }

  if (mode === "fast") {
    return {
      model: groq(MODEL_IDS.groqLlama4Scout),
      modelId: MODEL_IDS.groqLlama4Scout,
      provider: "groq",
    };
  }

  return {
    model: groq(MODEL_IDS.groqLlama8bInstant),
    modelId: MODEL_IDS.groqLlama8bInstant,
    provider: "groq",
  };
}

/**
 * The fallback chain used when the primary model for a mode errors with
 * a transient provider failure (429 / 5xx / overloaded).
 *
 * Ordered from "best quality that's still available" to "will almost
 * certainly work".
 */
export function fallbackChainFor(mode: ModelMode): ResolvedModel[] {
  if (mode === "quality") {
    const chain: ResolvedModel[] = [];
    if (process.env.ANTHROPIC_API_KEY) {
      chain.push({
        model: groq(MODEL_IDS.groqGptOss120b),
        modelId: MODEL_IDS.groqGptOss120b,
        provider: "groq",
      });
    }
    chain.push({
      model: groq(MODEL_IDS.groqLlama4Scout),
      modelId: MODEL_IDS.groqLlama4Scout,
      provider: "groq",
    });
    return chain;
  }

  if (mode === "fast") {
    return [
      {
        model: groq(MODEL_IDS.groqGptOss120b),
        modelId: MODEL_IDS.groqGptOss120b,
        provider: "groq",
      },
    ];
  }

  return [];
}
