import { POSTHOG_DISTINCT_ID_HEADER } from "./constants";

/**
 * Returns a validated distinct_id from the client request header (browser chat / fetch).
 */
export function getDistinctIdFromRequest(request: Request): string | undefined {
  const raw = request.headers.get(POSTHOG_DISTINCT_ID_HEADER)?.trim();
  if (!raw || raw.length > 256 || /[\r\n<>]/.test(raw)) return undefined;
  return raw;
}
