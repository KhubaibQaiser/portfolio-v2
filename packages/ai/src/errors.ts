export class ContextTooLongError extends Error {
  constructor(message = "Context exceeds model window") {
    super(message);
    this.name = "ContextTooLongError";
  }
}

export class FabricationError extends Error {
  readonly offending: ReadonlyArray<string>;

  constructor(offending: ReadonlyArray<string>) {
    super(`Model referenced ids not present in source data: ${offending.join(", ")}`);
    this.name = "FabricationError";
    this.offending = offending;
  }
}

export class AiToneRejectedError extends Error {
  readonly score: number;
  readonly hits: ReadonlyArray<string>;

  constructor(score: number, hits: ReadonlyArray<string>) {
    super(`Output flagged as AI-toned (score=${score}, hits=${hits.join(", ")})`);
    this.name = "AiToneRejectedError";
    this.score = score;
    this.hits = hits;
  }
}

function statusFromError(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const record = error as { statusCode?: unknown; status?: unknown };
  for (const value of [record.statusCode, record.status]) {
    if (
      typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 100 &&
      value <= 599
    ) {
      return value;
    }
  }
  return undefined;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.toLowerCase();
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string") return message.toLowerCase();
  }
  return "";
}

/**
 * Groq on-demand TPM rejects oversized requests with HTTP 413.
 * The body often includes a billing URL; this is payload size, not an unpaid invoice.
 */
export function isRequestTooLargeError(error: unknown): boolean {
  if (!error) return false;
  const status = statusFromError(error);
  if (status === 413) return true;
  const msg = errorMessage(error);
  return (
    msg.includes("413") ||
    msg.includes("tokens per minute") ||
    msg.includes("request too large") ||
    msg.includes("payload too large") ||
    /\btpm\b/.test(msg)
  );
}

/**
 * Detect errors that mean "skip this model and try the next one":
 * rate limits, overloads, 5xx, and request/TPM 413s.
 */
export function isProviderRateLimitError(error: unknown): boolean {
  if (!error) return false;
  if (isRequestTooLargeError(error)) return true;

  const code = statusFromError(error);
  if (code === 429 || code === 529 || (code !== undefined && code >= 500 && code < 600)) {
    return true;
  }

  const msg = errorMessage(error);
  return (
    msg.includes("429") ||
    msg.includes("529") ||
    msg.includes("rate limit") ||
    msg.includes("overloaded") ||
    msg.includes("service unavailable") ||
    msg.includes("internal server error")
  );
}
