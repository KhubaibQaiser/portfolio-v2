import type { Handler } from "aws-lambda";
import { createLogger } from "@portfolio/observability";
import { toError } from "../../lib/to-error";
import { runScheduledNotify } from "../../lib/jobs/scheduled";

const logger = createLogger({
  serviceName: "portfolio-admin-job-notify-worker",
});

export const handler: Handler = async () => {
  try {
    await runScheduledNotify();
  } catch (error) {
    logger.error("job notify worker failed", { error: toError(error) });
    throw error;
  }
};
