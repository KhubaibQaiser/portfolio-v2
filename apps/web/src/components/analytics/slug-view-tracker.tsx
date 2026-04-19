"use client";

import { useEffect } from "react";
import { capturePortfolioEvent } from "@/lib/analytics/capture-client";
import { PortfolioEvents } from "@/lib/analytics/events";

type SlugViewTrackerProps = {
  kind: "project" | "blog";
  slug: string;
};

export function SlugViewTracker({ kind, slug }: SlugViewTrackerProps) {
  useEffect(() => {
    const event =
      kind === "project"
        ? PortfolioEvents.projectViewed
        : PortfolioEvents.blogPostViewed;
    capturePortfolioEvent(event, { slug });
  }, [kind, slug]);

  return null;
}
