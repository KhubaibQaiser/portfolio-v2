import type { PortfolioEventName } from "./events";
import { getPostHogServer } from "./posthog-server";

type JsonProps = Record<string, string | number | boolean | undefined>;

export async function captureServerEvent(
  distinctId: string | undefined,
  event: PortfolioEventName,
  properties?: JsonProps,
): Promise<void> {
  const client = getPostHogServer();
  if (!client) return;
  const env = process.env.POSTHOG_ENVIRONMENT ?? process.env.VERCEL_ENV;
  try {
    await client.captureImmediate({
      distinctId: distinctId ?? "anonymous",
      event,
      properties: {
        ...properties,
        ...(env ? { environment: env } : {}),
      },
    });
  } catch {
    // Analytics must not affect API responses.
  }
}
