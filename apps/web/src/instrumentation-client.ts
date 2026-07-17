import posthog from "posthog-js";

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const uiHost = process.env.NEXT_PUBLIC_POSTHOG_UI_HOST ?? "https://us.posthog.com";

if (token) {
  posthog.init(token, {
    api_host: "/ph",
    ui_host: uiHost,
    defaults: "2026-01-30",
    capture_pageview: false,
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    // Next.js /ph rewrites via OpenNext corrupt gzip request bodies
    // (PostHog returns 400 "invalid GZIP data"). Send plain JSON instead.
    disable_compression: true,
    // Explicit events + exceptions only — skip optional PostHog products/scripts.
    autocapture: false,
    disable_surveys: true,
    disable_session_recording: true,
    disable_web_experiments: true,
    enable_heatmaps: false,
    opt_in_site_apps: false,
    loaded: (ph) => {
      if (process.env.NODE_ENV === "development") {
        ph.debug();
      }
      const env = process.env.NEXT_PUBLIC_POSTHOG_ENVIRONMENT;
      if (env) {
        ph.register({ environment: env });
      }
    },
  });
}
