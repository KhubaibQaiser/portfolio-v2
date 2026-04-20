export class ContextTooLongError extends Error {
  constructor(message = "Context exceeds model window") {
    super(message);
    this.name = "ContextTooLongError";
  }
}

export class FabricationError extends Error {
  readonly offending: ReadonlyArray<string>;

  constructor(offending: ReadonlyArray<string>) {
    super(
      `Model referenced ids not present in source data: ${offending.join(", ")}`,
    );
    this.name = "FabricationError";
    this.offending = offending;
  }
}

export class AiToneRejectedError extends Error {
  readonly score: number;
  readonly hits: ReadonlyArray<string>;

  constructor(score: number, hits: ReadonlyArray<string>) {
    super(
      `Output flagged as AI-toned (score=${score}, hits=${hits.join(", ")})`,
    );
    this.name = "AiToneRejectedError";
    this.score = score;
    this.hits = hits;
  }
}

/**
 * Detect "rate limited / overloaded" style errors across Anthropic, Groq,
 * and generic fetch failures. Covers common shapes from the AI SDK.
 */
export function isProviderRateLimitError(error: unknown): boolean {
  if (!error) return false;

  if (
    typeof error === "object" &&
    "statusCode" in error &&
    typeof (error as { statusCode: unknown }).statusCode === "number"
  ) {
    const code = (error as { statusCode: number }).statusCode;
    if (code === 429 || code === 529 || (code >= 500 && code < 600)) {
      return true;
    }
  }

  if (
    typeof error === "object" &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  ) {
    const code = (error as { status: number }).status;
    if (code === 429 || code === 529 || (code >= 500 && code < 600)) {
      return true;
    }
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes("429") ||
      msg.includes("529") ||
      msg.includes("rate limit") ||
      msg.includes("overloaded") ||
      msg.includes("service unavailable") ||
      msg.includes("internal server error")
    ) {
      return true;
    }
  }

  return false;
}
