import { describe, expect, it, vi } from "vitest";
import type { SQSEvent } from "aws-lambda";

const mocks = vi.hoisted(() => ({
  processGenerationJob: vi.fn(),
}));

vi.mock("./process-generation-job", () => ({
  processGenerationJob: mocks.processGenerationJob,
}));
vi.mock("@portfolio/observability", () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import { handler } from "../../lambda/generation-job-worker";

function event(bodies: string[]): SQSEvent {
  return {
    Records: bodies.map((body, index) => ({
      messageId: `m-${index}`,
      receiptHandle: "r",
      body,
      attributes: {
        ApproximateReceiveCount: "1",
        SentTimestamp: "0",
        SenderId: "s",
        ApproximateFirstReceiveTimestamp: "0",
      },
      messageAttributes: {},
      md5OfBody: "",
      eventSource: "aws:sqs",
      eventSourceARN: "arn:aws:sqs:eu-west-1:1:q",
      awsRegion: "eu-west-1",
    })),
  };
}

describe("generation-job-worker", () => {
  it("processes a valid message and reports no batch failures", async () => {
    mocks.processGenerationJob.mockResolvedValue(undefined);
    const result = await handler(
      event([JSON.stringify({ jobId: "job-1" })]),
      {} as never,
      () => {},
    );
    expect(mocks.processGenerationJob).toHaveBeenCalledWith("job-1");
    expect(result).toEqual({ batchItemFailures: [] });
  });

  it("reports partial batch failure when processing throws", async () => {
    mocks.processGenerationJob.mockRejectedValue(new Error("boom"));
    const result = await handler(
      event([JSON.stringify({ jobId: "job-1" })]),
      {} as never,
      () => {},
    );
    expect(result).toEqual({
      batchItemFailures: [{ itemIdentifier: "m-0" }],
    });
  });

  it("drops an unparseable message without failing the batch", async () => {
    mocks.processGenerationJob.mockClear();
    const result = await handler(event(["not-json"]), {} as never, () => {});
    expect(mocks.processGenerationJob).not.toHaveBeenCalled();
    expect(result).toEqual({ batchItemFailures: [] });
  });
});
