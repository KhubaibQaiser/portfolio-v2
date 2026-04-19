"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { capturePortfolioEvent } from "@/lib/analytics/capture-client";
import { PortfolioEvents } from "@/lib/analytics/events";

export function ResumeViewTracker() {
  useEffect(() => {
    capturePortfolioEvent(PortfolioEvents.resumeView);
  }, []);
  return null;
}

export function ResumePdfDownloadLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href="/api/pdf"
      className={className}
      onClick={() =>
        capturePortfolioEvent(PortfolioEvents.resumePdfDownload)
      }
    >
      {children}
    </Link>
  );
}
