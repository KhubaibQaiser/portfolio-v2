import { getRateLimiter } from "@portfolio/data";
import type { RateLimitOptions } from "@portfolio/shared/ports";

type LimitOk = { ok: true };
type LimitDenied = {
  ok: false;
  reason: "rate-limit";
  retryAfterSeconds: number;
  limit: number;
  remaining: number;
};
export type ResumeAiRateLimitResult = LimitOk | LimitDenied;

const HOURLY: RateLimitOptions = {
  max: 10,
  windowSec: 60 * 60,
  prefix: "resume-ai:gen:h",
};
const DAILY: RateLimitOptions = {
  max: 40,
  windowSec: 24 * 60 * 60,
  prefix: "resume-ai:gen:d",
};

/**
 * 10 generations/hr + 40 generations/day per admin user, enforced through the
 * RateLimiter port (DynamoDB fixed-window). The no-op limiter (local/fixture
 * backend) always allows, so dev still works without DynamoDB.
 */
export async function checkResumeAiRateLimit(
  userId: string,
): Promise<ResumeAiRateLimitResult> {
  const limiter = getRateLimiter();
  const [hourly, daily] = await Promise.all([
    limiter.check(userId, HOURLY),
    limiter.check(userId, DAILY),
  ]);

  const denied = !hourly.ok ? hourly : !daily.ok ? daily : null;
  if (denied) {
    return {
      ok: false,
      reason: "rate-limit",
      retryAfterSeconds: denied.retryAfterSeconds,
      limit: denied.limit,
      remaining: denied.remaining,
    };
  }

  return { ok: true };
}
