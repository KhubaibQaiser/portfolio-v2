"use client";

import { useEffect, useRef, useState } from "react";
import type { TailoredResume } from "@portfolio/ai/schemas";
import type { FitReport } from "@portfolio/ui/resume-pdf";
import { cn } from "@/lib/utils";

type Props = {
  resume: TailoredResume | null;
  layoutId: string;
  revision: number;
};

const PREVIEW_DEBOUNCE_MS = 600;

function parseFitReport(value: string | null): FitReport | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "pageCount" in parsed &&
      "density" in parsed
    ) {
      return parsed as FitReport;
    }
  } catch {
    return null;
  }
  return null;
}

function describeFit(report: FitReport): string {
  const removed = report.droppedRoles + report.droppedBullets + report.droppedSkills;
  if (removed === 0 && report.droppedSections.length === 0) {
    return `One A4 page · ${report.density} density · no content removed`;
  }
  return `One A4 page · removed ${report.droppedRoles} roles, ${report.droppedBullets} bullets, and ${report.droppedSkills} skills`;
}

export function ResumePdfPreview({ resume, layoutId, revision }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fitReport, setFitReport] = useState<FitReport | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!resume) {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
      setUrl(null);
      setError(null);
      setFitReport(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);

      void (async () => {
        try {
          const res = await fetch("/api/resume/export", {
            method: "POST",
            signal: controller.signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kind: "resume",
              resume,
              layoutId: layoutId || undefined,
            }),
          });
          if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            throw new Error(
              typeof json.error === "string" ? json.error : "PDF preview failed",
            );
          }
          const nextFitReport = parseFitReport(res.headers.get("X-Resume-Fit-Report"));
          const blob = await res.blob();
          const nextUrl = URL.createObjectURL(blob);
          if (cancelled) {
            URL.revokeObjectURL(nextUrl);
            return;
          }
          if (urlRef.current) URL.revokeObjectURL(urlRef.current);
          urlRef.current = nextUrl;
          setUrl(nextUrl);
          setFitReport(nextFitReport);
        } catch (err) {
          if (cancelled || (err instanceof Error && err.name === "AbortError")) return;
          setError(err instanceof Error ? err.message : "PDF preview failed");
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [resume, layoutId, revision]);

  if (!resume) {
    return (
      <p className="text-muted-foreground text-xs">
        Tailor a resume to see the PDF for the selected layout.
      </p>
    );
  }

  if (!url && loading) {
    return <p className="text-muted-foreground text-xs">Rendering PDF preview…</p>;
  }

  if (!url && error) {
    return <p className="text-destructive text-xs">{error}</p>;
  }

  if (!url) {
    return <p className="text-muted-foreground text-xs">Rendering PDF preview…</p>;
  }

  return (
    <div className="space-y-1">
      {loading ? (
        <p className="text-muted-foreground text-xs">Updating PDF preview…</p>
      ) : error ? (
        <p className="text-destructive text-xs">{error}</p>
      ) : null}
      {fitReport ? (
        <p className="text-muted-foreground text-xs" aria-live="polite">
          {describeFit(fitReport)}
        </p>
      ) : null}
      <iframe
        title="Resume PDF preview"
        src={url}
        className={cn("border-border h-160 w-full rounded-lg border bg-white")}
      />
    </div>
  );
}
