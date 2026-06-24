"use client";

import { useEffect } from "react";
import { capturePortfolioEvent } from "@/lib/analytics/capture-client";
import { PortfolioEvents } from "@/lib/analytics/events";

type SlugViewTrackerProps = {
  slug: string;
};

export function SlugViewTracker({ slug }: SlugViewTrackerProps) {
  useEffect(() => {
    capturePortfolioEvent(PortfolioEvents.projectViewed, { slug });
  }, [slug]);

  return null;
}
