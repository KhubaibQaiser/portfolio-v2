import { SendMessageCommand, type SQSClient } from "@aws-sdk/client-sqs";
import type {
  GenerationJobQueue,
  GenerationJobQueueMessage,
} from "@portfolio/shared/ports";

export type SqsGenerationJobQueueConfig = {
  client: SQSClient;
  queueUrl: string;
};

/** SQS-backed {@link GenerationJobQueue}. The message body only carries the
 * job id — the durable payload lives in `GenerationJobStore`. */
export function createSqsGenerationJobQueue(
  config: SqsGenerationJobQueueConfig,
): GenerationJobQueue {
  const { client, queueUrl } = config;
  return {
    async enqueue(message: GenerationJobQueueMessage): Promise<void> {
      await client.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify(message),
        }),
      );
    },
  };
}
