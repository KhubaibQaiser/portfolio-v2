import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const DEFAULT_MAX = 10;
const DEFAULT_WINDOW_SEC = 60;

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

let ratelimit: Ratelimit | null | undefined;

function getRatelimit(): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  if (ratelimit === undefined) {
    const redis = new Redis({ url, token });
    const max = parsePositiveInt(process.env.CHAT_RATE_LIMIT_MAX, DEFAULT_MAX);
    const windowSec = parsePositiveInt(
      process.env.CHAT_RATE_LIMIT_WINDOW_SEC,
      DEFAULT_WINDOW_SEC,
    );
    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(max, `${windowSec} s`),
      prefix: "portfolio:chat",
      analytics: false,
    });
  }
  return ratelimit;
}

/** First public IP from proxy headers (Vercel, etc.). */
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
 * Application-level chat rate limit (sliding window per IP).
 * No-op when Upstash is not configured (e.g. local dev without Redis).
 */
export async function checkChatRateLimit(
  request: Request,
): Promise<ChatRateLimitResult> {
  const rl = getRatelimit();
  if (!rl) return { ok: true };

  const ip = getClientIp(request);
  const id = ip === "unknown" ? "unknown:chat" : `ip:${ip}`;

  const result = await rl.limit(id);
  void result.pending.catch(() => undefined);

  if (result.success) return { ok: true };

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((result.reset - Date.now()) / 1000),
  );

  return {
    ok: false,
    retryAfterSeconds,
    limit: result.limit,
    remaining: result.remaining,
  };
}
