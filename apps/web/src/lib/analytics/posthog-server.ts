import { PostHog } from "posthog-node";

let posthogServer: PostHog | null = null;

export function getPostHogServer(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!key || !host) return null;
  if (!posthogServer) {
    posthogServer = new PostHog(key, {
      host,
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return posthogServer;
}

export async function shutdownPostHogServer(): Promise<void> {
  if (posthogServer) {
    await posthogServer.shutdown();
    posthogServer = null;
  }
}
