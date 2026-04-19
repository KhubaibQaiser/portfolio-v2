import { parseDistinctIdFromCookie } from "@/lib/analytics/posthog-cookie";
import { getPostHogServer, shutdownPostHogServer } from "@/lib/analytics/posthog-server";

export function register() {}

function getCookieHeader(request: {
  headers?: Headers | { get?: (name: string) => string | null | undefined };
}): string | null {
  const h = request.headers;
  if (!h) return null;
  if (typeof Headers !== "undefined" && h instanceof Headers) {
    return h.get("cookie");
  }
  return h.get?.("cookie") ?? null;
}

export async function onRequestError(
  err: unknown,
  request: { headers?: Headers | { get?: (name: string) => string | null | undefined } },
): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const ph = getPostHogServer();
  if (!ph) return;

  const distinctId = parseDistinctIdFromCookie(getCookieHeader(request));

  try {
    await ph.captureExceptionImmediate(err, distinctId, {
      source: "next_onRequestError",
    });
  } finally {
    await shutdownPostHogServer();
  }
}
