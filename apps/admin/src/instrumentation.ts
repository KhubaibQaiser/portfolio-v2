/**
 * Next.js instrumentation must not import Powertools: its webpack graph for
 * this file cannot resolve `node:` specifiers (`node:console` / `node:crypto`).
 * Emit the same `{ $.level = "ERROR" }` JSON the AppErrors metric filter uses.
 */
export function register() {}

export function onRequestError(
  error: { digest?: string } & Error,
  request: { path: string; method: string },
  context: { routePath?: string; routeType?: string },
): void {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(
    JSON.stringify({
      level: "ERROR",
      service: "portfolio-admin",
      message: "unhandled admin request error",
      timestamp: new Date().toISOString(),
      digest: error.digest,
      method: request.method,
      path: request.path,
      routePath: context.routePath,
      routeType: context.routeType,
      error: { name: err.name, message: err.message, stack: err.stack },
    }),
  );
}
