"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { usePostHog } from "@posthog/react";

export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();
  const sentKey = useRef<string | null>(null);

  useEffect(() => {
    if (!posthog || !process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return;
    const search = searchParams?.toString();
    const url = pathname + (search ? `?${search}` : "");
    if (sentKey.current === url) return;
    sentKey.current = url;
    posthog.capture("$pageview", {
      $current_url: typeof window !== "undefined" ? window.location.href : url,
    });
  }, [pathname, searchParams, posthog]);

  return null;
}
