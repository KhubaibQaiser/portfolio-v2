import { getRateLimiter } from "@portfolio/data";

const DEFAULT_MAX = 10;
const DEFAULT_WINDOW_SEC = 60;
const PREFIX = "chat";

type ChatRateLimitOk = { ok: true };
export type ChatRateLimitDenied = {
  ok: false;
  retryAfterSeconds: number;
  limit: number;
  remaining: number;
};
export type ChatRateLimitResult = ChatRateLimitOk | ChatRateLimitDenied;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** First public IP from proxy headers (CloudFront, etc.). */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

/**
 * Application-level chat rate limit (fixed window per IP) via the RateLimiter
 * port. The no-op adapter (fixture/local backend) always allows, so dev works
 * without DynamoDB. Store errors propagate to the caller rather than being
 * swallowed here.
 */
export async function checkChatRateLimit(request: Request): Promise<ChatRateLimitResult> {
  const ip = getClientIp(request);
  const id = ip === "unknown" ? "unknown:chat" : `ip:${ip}`;

  const result = await getRateLimiter().check(id, {
    max: parsePositiveInt(process.env.CHAT_RATE_LIMIT_MAX, DEFAULT_MAX),
    windowSec: parsePositiveInt(
      process.env.CHAT_RATE_LIMIT_WINDOW_SEC,
      DEFAULT_WINDOW_SEC,
    ),
    prefix: PREFIX,
  });

  return result;
}
