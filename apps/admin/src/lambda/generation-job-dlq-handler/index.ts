import type { SQSEvent, SQSHandler } from "aws-lambda";
import { createLogger } from "@portfolio/observability";
import { getGenerationJobStore } from "@portfolio/data";
import { toError } from "../../lib/to-error";

const logger = createLogger({
  serviceName: "portfolio-admin-generation-job-dlq-handler",
});

type GenerationJobMessage = { jobId: string };

function parseMessageBody(body: string): GenerationJobMessage | null {
  try {
    const parsed: unknown = JSON.parse(body);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "jobId" in parsed &&
      typeof (parsed as { jobId: unknown }).jobId === "string"
    ) {
      return parsed as GenerationJobMessage;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Consumes the generation-job DLQ: a message only lands here after the worker
 * failed to process it `maxReceiveCount` times in a row. Flips the job to a
 * terminal "failed" state so a client that's been polling status stops
 * waiting instead of hanging until the job's TTL expires.
 */
export const handler: SQSHandler = async (event: SQSEvent): Promise<void> => {
  const store = getGenerationJobStore();

  for (const record of event.Records) {
    const message = parseMessageBody(record.body);
    if (!message) {
      logger.error("dlq message could not be parsed", { messageId: record.messageId });
      continue;
    }
    try {
      const job = await store.get(message.jobId);
      if (!job || job.status === "ready" || job.status === "failed") continue;
      await store.markFailed(message.jobId, {
        code: "PROVIDER_UNAVAILABLE",
        message: "Generation failed after multiple attempts. Please try again.",
        retryable: true,
      });
      logger.error("generation job moved to DLQ, marked failed", {
        jobId: message.jobId,
      });
    } catch (error) {
      logger.error("dlq handler failed to mark job failed", {
        jobId: message.jobId,
        error: toError(error),
      });
    }
  }
};
