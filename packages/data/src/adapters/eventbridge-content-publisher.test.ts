import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { describe, expect, it, vi } from "vitest";
import { CONTENT_CHANGED_EVENT } from "../content-events";
import { createEventBridgeContentPublisher } from "./eventbridge-content-publisher";

function makePublisher(response: object = { FailedEntryCount: 0, Entries: [{}] }) {
  const send = vi.fn(async (_command: unknown) => response);
  const client = { send } as unknown as EventBridgeClient;
  return {
    publisher: createEventBridgeContentPublisher({
      client,
      eventBusName: "Portfolio-bus",
    }),
    send,
  };
}

describe("createEventBridgeContentPublisher", () => {
  it("puts one ContentChanged event on the configured bus", async () => {
    const { publisher, send } = makePublisher();
    await publisher.publishContentChanged();

    const command = send.mock.calls.at(0)?.[0];
    if (!(command instanceof PutEventsCommand))
      throw new Error("expected PutEventsCommand");
    expect(command.input.Entries).toHaveLength(1);
    expect(command.input.Entries?.[0]).toMatchObject({
      EventBusName: "Portfolio-bus",
      Source: CONTENT_CHANGED_EVENT.source,
      DetailType: CONTENT_CHANGED_EVENT.detailType,
    });
  });

  it("throws when EventBridge rejects the entry", async () => {
    const { publisher } = makePublisher({
      FailedEntryCount: 1,
      Entries: [{ ErrorCode: "AccessDenied", ErrorMessage: "nope" }],
    });
    await expect(publisher.publishContentChanged()).rejects.toThrow(/AccessDenied/);
  });
});
