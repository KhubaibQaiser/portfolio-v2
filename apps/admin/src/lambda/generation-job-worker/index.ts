import type { SQSBatchResponse, SQSEvent, SQSHandler } from "aws-lambda";
import { createLogger } from "@portfolio/observability";
import { processGenerationJob } from "../../lib/resume-ai/process-generation-job";
import { toError } from "../../lib/to-error";

const logger = createLogger({
  serviceName: "portfolio-admin-generation-job-worker",
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
 * SQS-triggered worker: runs one AI generation job per message. Off any
 * CloudFront/HTTP request path, so it runs with its own long timeout
 * (see AdminStack). batchSize is 1 because a single generation can take
 * minutes — a larger batch would exceed the function timeout.
 *
 * Uses partial batch item failure reporting: a message that fails is
 * reported back individually so SQS only redrives that one record. After
 * maxReceiveCount redeliveries it lands in the DLQ.
 */
export const handler: SQSHandler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchResponse["batchItemFailures"] = [];

  for (const record of event.Records) {
    const message = parseMessageBody(record.body);
    if (!message) {
      logger.error("generation job message could not be parsed, dropping", {
        messageId: record.messageId,
      });
      continue;
    }
    try {
      await processGenerationJob(message.jobId);
    } catch (error) {
      logger.error("generation job worker failed for message", {
        messageId: record.messageId,
        jobId: message.jobId,
        error: toError(error),
      });
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};
