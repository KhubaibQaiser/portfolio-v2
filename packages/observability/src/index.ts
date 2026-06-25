import { Logger } from "@aws-lambda-powertools/logger";

/**
 * Shared structured logger for the portfolio apps, built on AWS Lambda
 * Powertools. Emits JSON to stdout, which CloudWatch ingests automatically —
 * queryable via CloudWatch Logs Insights and consistent across every Lambda.
 *
 * Powertools reads `POWERTOOLS_LOG_LEVEL` (defaults to `INFO`) and
 * `POWERTOOLS_SERVICE_NAME` from the environment; `serviceName` passed here
 * takes precedence so each app is identifiable in shared queries.
 *
 * Note: under OpenNext we don't own the Next.js server Lambda handler, so the
 * Powertools middleware/decorator (which auto-injects request id + cold start)
 * can't be attached. Use `logger.appendKeys(...)` at call sites when you need
 * request-scoped context.
 */
export type CreateLoggerOptions = {
  /** Stable identifier for the emitting app, e.g. `portfolio-admin`. */
  serviceName: string;
};

export function createLogger({ serviceName }: CreateLoggerOptions): Logger {
  return new Logger({ serviceName });
}

export { Logger };
