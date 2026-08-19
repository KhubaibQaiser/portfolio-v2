import { SendMessageCommand, type SQSClient } from "@aws-sdk/client-sqs";
import type { RenderJobQueue, RenderJobQueueMessage } from "@portfolio/shared/ports";

export type SqsRenderJobQueueConfig = {
  client: SQSClient;
  queueUrl: string;
};

/** SQS-backed {@link RenderJobQueue}. The message body only carries the job
 * id — the durable payload lives in `RenderJobStore`, so the queue is purely
 * a "go process this" signal with no size limit concerns. */
export function createSqsRenderJobQueue(config: SqsRenderJobQueueConfig): RenderJobQueue {
  const { client, queueUrl } = config;
  return {
    async enqueue(message: RenderJobQueueMessage): Promise<void> {
      await client.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify(message),
        }),
      );
    },
  };
}
