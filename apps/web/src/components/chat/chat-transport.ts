import { DefaultChatTransport } from "ai";
import posthog from "posthog-js";
import { POSTHOG_DISTINCT_ID_HEADER } from "@/lib/analytics/constants";

/** Default when JSON body has no usable `error` string (matches `/api/chat` rate-limit copy). */
export const RATE_LIMIT_FALLBACK_MESSAGE =
  "Too many messages. Please wait a moment before sending another.";

export class ChatRateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.name = "ChatRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function parseRateLimitErrorMessage(data: unknown): string {
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "string"
  ) {
    const trimmed = (data as { error: string }).error.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return RATE_LIMIT_FALLBACK_MESSAGE;
}

function parseRetryAfterSeconds(res: Response, data: unknown): number {
  if (
    typeof data === "object" &&
    data !== null &&
    "retryAfterSeconds" in data &&
    typeof (data as { retryAfterSeconds: unknown }).retryAfterSeconds ===
      "number"
  ) {
    const n = Math.ceil(
      (data as { retryAfterSeconds: number }).retryAfterSeconds,
    );
    if (Number.isFinite(n) && n > 0) return n;
  }
  const header = res.headers.get("Retry-After");
  if (header) {
    const n = Number.parseInt(header, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 60;
}

export const chatTransport = new DefaultChatTransport({
  api: "/api/chat",
  fetch: async (input, init) => {
    const headers = new Headers(init?.headers);
    if (
      typeof window !== "undefined" &&
      process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
    ) {
      const id = posthog.get_distinct_id();
      if (id) {
        headers.set(POSTHOG_DISTINCT_ID_HEADER, id);
      }
    }
    const res = await fetch(input, { ...init, headers });
    if (res.status !== 429) return res;

    let data: unknown;
    try {
      data = await res.clone().json();
    } catch {
      data = undefined;
    }
    const retryAfterSeconds = parseRetryAfterSeconds(res, data);
    const message = parseRateLimitErrorMessage(data);
    throw new ChatRateLimitError(message, retryAfterSeconds);
  },
});
