"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function downloadPdf() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/pdf");
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "PDF download failed. Please try again.");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition");
      const filename =
        disposition?.match(/filename="([^"]+)"/i)?.[1] ?? "Khubaib-Qaiser-Resume.pdf";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      capturePortfolioEvent(PortfolioEvents.resumePdfDownload);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "PDF download failed. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        className={`relative ${className ?? ""}`}
        onClick={() => void downloadPdf()}
        disabled={pending}
        aria-busy={pending}
      >
        {/* Children stay mounted so the button keeps its resting size while pending. */}
        <span
          className={`flex items-center gap-2 ${pending ? "invisible" : ""}`}
          aria-hidden={pending}
        >
          {children}
        </span>
        {pending ? (
          <span className="absolute inset-0 flex items-center justify-center">
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
            <span className="sr-only">Preparing PDF…</span>
          </span>
        ) : null}
      </button>
      {error ? (
        <span role="alert" className="text-destructive block text-xs">
          {error}
        </span>
      ) : null}
    </div>
  );
}
