import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import type { ContentPublisher } from "@portfolio/shared/ports";
import { createEventBridgeContentPublisher } from "./adapters/eventbridge-content-publisher";

export { createEventBridgeContentPublisher } from "./adapters/eventbridge-content-publisher";
export { CONTENT_CHANGED_EVENT } from "./content-events";

let cached: ContentPublisher | null | undefined;

/**
 * Returns the publisher when `CONTENT_EVENT_BUS_NAME` is configured (deployed
 * admin), or `null` in fixture/local dev where there is no cache to purge.
 */
export function getContentPublisher(): ContentPublisher | null {
  if (cached === undefined) {
    const eventBusName = process.env.CONTENT_EVENT_BUS_NAME;
    cached = eventBusName
      ? createEventBridgeContentPublisher({
          client: new EventBridgeClient({
            region: process.env.AWS_REGION ?? "eu-west-1",
          }),
          eventBusName,
        })
      : null;
  }
  return cached;
}
