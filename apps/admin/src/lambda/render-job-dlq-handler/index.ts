import type { SQSEvent, SQSHandler } from "aws-lambda";
import { createLogger } from "@portfolio/observability";
import { getRenderJobStore } from "@portfolio/data";
import { toError } from "../../lib/to-error";

const logger = createLogger({ serviceName: "portfolio-admin-render-job-dlq-handler" });

type RenderJobMessage = { jobId: string };

function parseMessageBody(body: string): RenderJobMessage | null {
  try {
    const parsed: unknown = JSON.parse(body);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "jobId" in parsed &&
      typeof (parsed as { jobId: unknown }).jobId === "string"
    ) {
      return parsed as RenderJobMessage;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Consumes the render-job DLQ: a message only lands here after the worker
 * failed to process it `maxReceiveCount` times in a row. Flips the job to a
 * terminal "failed" state so a client that's been polling status stops
 * waiting instead of hanging until the job's TTL expires.
 */
export const handler: SQSHandler = async (event: SQSEvent): Promise<void> => {
  const renderJobStore = getRenderJobStore();

  for (const record of event.Records) {
    const message = parseMessageBody(record.body);
    if (!message) {
      logger.error("dlq message could not be parsed", { messageId: record.messageId });
      continue;
    }
    try {
      const job = await renderJobStore.get(message.jobId);
      if (!job || job.status === "ready" || job.status === "failed") continue;
      await renderJobStore.markFailed(
        message.jobId,
        "Rendering failed after multiple attempts. Please try again.",
      );
      logger.error("render job moved to DLQ, marked failed", { jobId: message.jobId });
    } catch (error) {
      logger.error("dlq handler failed to mark job failed", {
        jobId: message.jobId,
        error: toError(error),
      });
    }
  }
};
