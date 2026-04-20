import { MODEL_IDS, type ModelId } from "./models";

export type LlmUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type UsageRecord = {
  model: ModelId | string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  fallbackUsed: boolean;
};

/**
 * Pricing in USD per 1M tokens, sourced from public model cards.
 * Kept conservative (upper bound) so the daily-cap circuit breaker
 * never silently undercounts.
 */
const PRICING: Record<string, { input: number; output: number }> = {
  [MODEL_IDS.anthropicSonnet]: { input: 3.0, output: 15.0 },
  [MODEL_IDS.anthropicHaiku]: { input: 1.0, output: 5.0 },
  [MODEL_IDS.groqLlama4Scout]: { input: 0.11, output: 0.34 },
  [MODEL_IDS.groqGptOss120b]: { input: 0.15, output: 0.75 },
  [MODEL_IDS.groqLlama8bInstant]: { input: 0.05, output: 0.08 },
};

export function estimateCostUsd(
  usage: LlmUsage,
  modelId: ModelId | string,
): number {
  const price = PRICING[modelId];
  if (!price) return 0;
  const inTok = usage.inputTokens ?? 0;
  const outTok = usage.outputTokens ?? 0;
  const cost = (inTok * price.input + outTok * price.output) / 1_000_000;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

export function formatUsage(
  usage: LlmUsage,
  modelId: ModelId | string,
  opts: { latencyMs: number; fallbackUsed?: boolean },
): UsageRecord {
  const inTok = usage.inputTokens ?? 0;
  const outTok = usage.outputTokens ?? 0;
  const totalTok = usage.totalTokens ?? inTok + outTok;
  return {
    model: modelId,
    inputTokens: inTok,
    outputTokens: outTok,
    totalTokens: totalTok,
    costUsd: estimateCostUsd(usage, modelId),
    latencyMs: opts.latencyMs,
    fallbackUsed: Boolean(opts.fallbackUsed),
  };
}
