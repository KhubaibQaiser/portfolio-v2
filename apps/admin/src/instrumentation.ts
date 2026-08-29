import { logger } from "@/lib/logger";
import { toError } from "@/lib/to-error";

export function register() {}

/**
 * Next.js calls this for uncaught App Router errors (RSC, route handlers,
 * server actions). Powertools JSON ERROR lines feed the shared AppErrors
 * metric filter (ADR 0002). Route handlers that catch and `logger.error`
 * themselves will not hit this hook.
 */
export function onRequestError(
  error: { digest?: string } & Error,
  request: { path: string; method: string },
  context: { routePath?: string; routeType?: string },
): void {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  logger.error("unhandled admin request error", {
    error: toError(error),
    digest: error.digest,
    method: request.method,
    path: request.path,
    routePath: context.routePath,
    routeType: context.routeType,
  });
}
