import { getRateLimiter } from "@portfolio/data";
import { getClientIp } from "@/lib/chat-rate-limit";

const DEFAULT_MAX = 5;
const DEFAULT_WINDOW_SEC = 60;
const PREFIX = "resume-pdf";

type ResumePdfRateLimitOk = { ok: true };

export type ResumePdfRateLimitDenied = {
  ok: false;
  retryAfterSeconds: number;
  limit: number;
  remaining: number;
};

export type ResumePdfRateLimitResult = ResumePdfRateLimitOk | ResumePdfRateLimitDenied;

export async function checkResumePdfRateLimit(
  request: Request,
): Promise<ResumePdfRateLimitResult> {
  const ip = getClientIp(request);
  return getRateLimiter().check(ip === "unknown" ? "unknown:resume-pdf" : `ip:${ip}`, {
    max: DEFAULT_MAX,
    windowSec: DEFAULT_WINDOW_SEC,
    prefix: PREFIX,
  });
}
