import { getRateLimiter } from "@portfolio/data";
import { getClientIp } from "@/lib/chat-rate-limit";

const DEFAULT_MAX = 5;
const DEFAULT_WINDOW_SEC = 3600;
const PREFIX = "contact";

type ContactRateLimitOk = { ok: true };
export type ContactRateLimitDenied = {
  ok: false;
  retryAfterSeconds: number;
  limit: number;
  remaining: number;
};
export type ContactRateLimitResult = ContactRateLimitOk | ContactRateLimitDenied;

/**
 * Application-level contact form rate limit (fixed window per IP) via the
 * RateLimiter port. The no-op adapter (fixture/local backend) always allows.
 */
export async function checkContactRateLimit(
  request: Request,
): Promise<ContactRateLimitResult> {
  const ip = getClientIp(request);
  const id = ip === "unknown" ? "unknown:contact" : `ip:${ip}`;

  return getRateLimiter().check(id, {
    max: DEFAULT_MAX,
    windowSec: DEFAULT_WINDOW_SEC,
    prefix: PREFIX,
  });
}
