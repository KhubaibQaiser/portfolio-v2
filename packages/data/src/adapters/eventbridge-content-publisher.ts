import { PutEventsCommand, type EventBridgeClient } from "@aws-sdk/client-eventbridge";
import type { ContentPublisher } from "@portfolio/shared/ports";
import { CONTENT_CHANGED_EVENT } from "../content-events";

export type EventBridgeContentPublisherConfig = {
  client: EventBridgeClient;
  eventBusName: string;
};

export function createEventBridgeContentPublisher(
  config: EventBridgeContentPublisherConfig,
): ContentPublisher {
  const { client, eventBusName } = config;
  return {
    async publishContentChanged(): Promise<void> {
      const result = await client.send(
        new PutEventsCommand({
          Entries: [
            {
              EventBusName: eventBusName,
              Source: CONTENT_CHANGED_EVENT.source,
              DetailType: CONTENT_CHANGED_EVENT.detailType,
              Detail: JSON.stringify({ at: new Date().toISOString() }),
            },
          ],
        }),
      );
      // PutEvents reports per-entry failures with a 200 response.
      if (result.FailedEntryCount) {
        const entry = result.Entries?.[0];
        throw new Error(
          `ContentChanged event rejected: ${entry?.ErrorCode ?? "unknown"} ${entry?.ErrorMessage ?? ""}`.trim(),
        );
      }
    },
  };
}
