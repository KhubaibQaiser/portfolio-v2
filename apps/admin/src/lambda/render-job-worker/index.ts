import type { SQSBatchResponse, SQSEvent, SQSHandler } from "aws-lambda";
import { createLogger } from "@portfolio/observability";
import { processRenderJob } from "../../lib/resume-ai/process-render-job";
import { toError } from "../../lib/to-error";

const logger = createLogger({ serviceName: "portfolio-admin-render-job-worker" });

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
 * SQS-triggered worker: renders one PDF render job per message. Off any
 * CloudFront/HTTP request path, so it runs with its own long timeout/high
 * memory (see AdminStack) — the fit algorithm (bounded + total per
 * render-resume-pdf.tsx) essentially never runs out of time here.
 *
 * Uses partial batch item failure reporting: a message that fails is
 * reported back individually so SQS only redrives that one record, not the
 * whole batch. After maxReceiveCount redeliveries it lands in the DLQ, whose
 * handler (render-job-dlq-handler) flips the job to a terminal "failed"
 * state.
 */
export const handler: SQSHandler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchResponse["batchItemFailures"] = [];

  for (const record of event.Records) {
    const message = parseMessageBody(record.body);
    if (!message) {
      logger.error("render job message could not be parsed, dropping", {
        messageId: record.messageId,
      });
      continue;
    }
    try {
      await processRenderJob(message.jobId);
    } catch (error) {
      logger.error("render job worker failed for message", {
        messageId: record.messageId,
        jobId: message.jobId,
        error: toError(error),
      });
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};
