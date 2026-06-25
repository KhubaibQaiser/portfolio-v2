import { createLogger } from "@portfolio/observability";

/**
 * App-wide structured logger for the public web server (Node runtime).
 */
export const logger = createLogger({ serviceName: "portfolio-web" });
