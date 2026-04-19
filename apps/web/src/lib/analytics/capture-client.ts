"use client";

import posthog from "posthog-js";
import type { PortfolioEventName } from "./events";

type JsonProps = Record<string, string | number | boolean | undefined>;

export function capturePortfolioEvent(
  event: PortfolioEventName,
  properties?: JsonProps,
): void {
  if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return;
  const env = process.env.NEXT_PUBLIC_POSTHOG_ENVIRONMENT;
  posthog.capture(event, {
    ...properties,
    ...(env ? { environment: env } : {}),
  });
}
