import "server-only";
import type { LanguageModel } from "ai";
import { MODEL_IDS, qualityGenerateChainIds, type ModelId } from "./model-ids";
import { anthropic, groq } from "./providers";

export type ModelMode = "quality" | "fast" | "cheap";

export type ResolvedModel = {
  model: LanguageModel;
  modelId: ModelId;
  provider: "anthropic" | "groq";
};

function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function resolveModel(modelId: ModelId): ResolvedModel {
  if (modelId === MODEL_IDS.anthropicHaiku || modelId === MODEL_IDS.anthropicSonnet) {
    return { model: anthropic(modelId), modelId, provider: "anthropic" };
  }
  return { model: groq(modelId), modelId, provider: "groq" };
}

/**
 * Resolve a model for a given use case.
 *
 * - `quality`: resume generate; Claude Haiku 4.5 when Anthropic is configured,
 *   otherwise Groq `openai/gpt-oss-20b`.
 * - `fast`:    portfolio chat / low-latency; Groq `openai/gpt-oss-120b`.
 * - `cheap`:   tiny/cheap pass (ATS scoring); Groq `openai/gpt-oss-20b`.
 */
export function modelFor(mode: ModelMode): ResolvedModel {
  if (mode === "quality") {
    return resolveModel(qualityGenerateChainIds(hasAnthropicKey())[0]!);
  }

  if (mode === "fast") {
    return resolveModel(MODEL_IDS.groqGptOss120b);
  }

  return resolveModel(MODEL_IDS.groqGptOss20b);
}

/**
 * The fallback chain used when the primary model for a mode errors with
 * a transient provider failure (429 / 413 / 5xx / overloaded).
 */
export function fallbackChainFor(mode: ModelMode): ResolvedModel[] {
  if (mode === "quality") {
    const [, ...rest] = qualityGenerateChainIds(hasAnthropicKey());
    return rest.map(resolveModel);
  }

  if (mode === "fast") {
    return [resolveModel(MODEL_IDS.groqGptOss20b)];
  }

  return [];
}
