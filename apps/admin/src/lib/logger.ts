import { createLogger } from "@portfolio/observability";

/**
 * App-wide structured logger for the admin server (Node runtime only — do not
 * import from `middleware.ts`, which runs on the Edge runtime).
 */
export const logger = createLogger({ serviceName: "portfolio-admin" });
