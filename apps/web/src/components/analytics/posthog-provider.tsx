"use client";

import type { ReactNode } from "react";
import posthog from "posthog-js";
import { PostHogProvider } from "@posthog/react";

export function PostHogAnalyticsProvider({ children }: { children: ReactNode }) {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
