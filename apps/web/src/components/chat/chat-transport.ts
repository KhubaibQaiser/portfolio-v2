import { DefaultChatTransport } from "ai";

const RATE_LIMIT_MESSAGE =
  "Too many messages. Please wait a moment before sending another.";

export class ChatRateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(RATE_LIMIT_MESSAGE);
    this.name = "ChatRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
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
    const res = await fetch(input, init);
    if (res.status !== 429) return res;

    let data: unknown;
    try {
      data = await res.clone().json();
    } catch {
      data = undefined;
    }
    const retryAfterSeconds = parseRetryAfterSeconds(res, data);
    throw new ChatRateLimitError(retryAfterSeconds);
  },
});
