import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { describe, expect, it, vi } from "vitest";
import { createSqsGenerationJobQueue } from "./sqs-generation-job-queue";

function makeQueue(send = vi.fn(async (_command: unknown) => ({}))) {
  const client = { send } as unknown as SQSClient;
  return {
    queue: createSqsGenerationJobQueue({ client, queueUrl: "https://sqs/queue" }),
    send,
  };
}

describe("createSqsGenerationJobQueue", () => {
  it("sends the job id as the message body", async () => {
    const { queue, send } = makeQueue();
    await queue.enqueue({ jobId: "job-1" });

    const command = send.mock.calls.at(0)?.[0];
    if (!(command instanceof SendMessageCommand))
      throw new Error("expected SendMessageCommand");
    expect(command.input).toMatchObject({
      QueueUrl: "https://sqs/queue",
      MessageBody: JSON.stringify({ jobId: "job-1" }),
    });
  });
});
