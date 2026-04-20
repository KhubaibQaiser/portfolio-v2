import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type LimitOk = { ok: true };
type LimitDenied = {
  ok: false;
  reason: "rate-limit";
  retryAfterSeconds: number;
  limit: number;
  remaining: number;
};
export type ResumeAiRateLimitResult = LimitOk | LimitDenied;

let hourly: Ratelimit | null | undefined;
let daily: Ratelimit | null | undefined;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function getHourly(): Ratelimit | null {
  if (hourly !== undefined) return hourly;
  const redis = getRedis();
  if (!redis) {
    hourly = null;
    return null;
  }
  hourly = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    prefix: "portfolio:resume-ai:gen:h",
    analytics: false,
  });
  return hourly;
}

function getDaily(): Ratelimit | null {
  if (daily !== undefined) return daily;
  const redis = getRedis();
  if (!redis) {
    daily = null;
    return null;
  }
  daily = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(40, "24 h"),
    prefix: "portfolio:resume-ai:gen:d",
    analytics: false,
  });
  return daily;
}

/**
 * 10 generations/hr + 40 generations/day per admin user.
 * No-op when Upstash isn't configured so local dev still works.
 */
export async function checkResumeAiRateLimit(
  userId: string,
): Promise<ResumeAiRateLimitResult> {
  const h = getHourly();
  const d = getDaily();
  if (!h || !d) return { ok: true };

  const [hr, dr] = await Promise.all([h.limit(userId), d.limit(userId)]);
  void hr.pending.catch(() => undefined);
  void dr.pending.catch(() => undefined);

  if (!hr.success || !dr.success) {
    const reset = hr.success ? dr.reset : hr.reset;
    return {
      ok: false,
      reason: "rate-limit",
      retryAfterSeconds: Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
      limit: hr.success ? dr.limit : hr.limit,
      remaining: hr.success ? dr.remaining : hr.remaining,
    };
  }

  return { ok: true };
}
