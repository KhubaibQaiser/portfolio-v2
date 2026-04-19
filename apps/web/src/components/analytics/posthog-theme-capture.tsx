"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import { capturePortfolioEvent } from "@/lib/analytics/capture-client";
import { PortfolioEvents } from "@/lib/analytics/events";

export function PostHogThemeCapture() {
  const { theme, resolvedTheme } = useTheme();
  const skipFirst = useRef(true);

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    const value = theme ?? resolvedTheme;
    if (!value) return;
    capturePortfolioEvent(PortfolioEvents.themeChanged, { theme: value });
  }, [theme, resolvedTheme]);

  return null;
}
