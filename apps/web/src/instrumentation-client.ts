import posthog from "posthog-js";

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const uiHost =
  process.env.NEXT_PUBLIC_POSTHOG_UI_HOST ?? "https://us.posthog.com";

if (token) {
  posthog.init(token, {
    api_host: "/ph",
    ui_host: uiHost,
    defaults: "2026-01-30",
    capture_pageview: false,
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    loaded: (ph) => {
      if (process.env.NODE_ENV === "development") {
        ph.debug();
      }
      const env =
        process.env.NEXT_PUBLIC_POSTHOG_ENVIRONMENT ?? process.env.VERCEL_ENV;
      if (env) {
        ph.register({ environment: env });
      }
    },
  });
}
