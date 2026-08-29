import type { Handler } from "aws-lambda";
import { createLogger } from "@portfolio/observability";
import { toError } from "../../lib/to-error";
import { runScheduledIngest } from "../../lib/jobs/scheduled";

const logger = createLogger({
  serviceName: "portfolio-admin-job-ingest-worker",
});

export const handler: Handler = async () => {
  try {
    await runScheduledIngest();
  } catch (error) {
    logger.error("job ingest worker failed", { error: toError(error) });
    throw error;
  }
};
