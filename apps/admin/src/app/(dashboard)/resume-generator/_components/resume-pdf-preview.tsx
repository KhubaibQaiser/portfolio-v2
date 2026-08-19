"use client";

import { useEffect, useRef, useState } from "react";
import { tailoredResumeSchema, type TailoredResume } from "@portfolio/ai/schemas";
import type { FitReport } from "@portfolio/ui/resume-pdf";
import { cn } from "@/lib/utils";
import { requestRenderedPdf } from "./request-rendered-pdf";

type Props = {
  resume: TailoredResume | null;
  layoutId: string;
  revision: number;
  context: {
    generationId: string;
    sourceHash: string;
    guidelineHash: string;
  } | null;
  stale: boolean;
};

const PREVIEW_DEBOUNCE_MS = 600;

function describeFit(report: FitReport): string {
  const removed = report.droppedRoles + report.droppedBullets + report.droppedSkills;
  if (removed === 0 && report.droppedSections.length === 0) {
    return `One A4 page · ${report.density} density · no content removed`;
  }
  return `One A4 page · removed ${report.droppedRoles} roles, ${report.droppedBullets} bullets, and ${report.droppedSkills} skills`;
}

export function ResumePdfPreview({ resume, layoutId, revision, context, stale }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fitReport, setFitReport] = useState<FitReport | null>(null);
  const urlRef = useRef<string | null>(null);
  const requestVersionRef = useRef(0);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!resume || !context || stale) {
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

    const validatedResume = tailoredResumeSchema.safeParse(resume);
    if (!validatedResume.success) {
      setError("Fix the highlighted resume fields before previewing the PDF.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;

    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);

      void (async () => {
        try {
          const { blob, fitReport: nextFitReport } = await requestRenderedPdf(
            {
              kind: "resume",
              generationId: context.generationId,
              resume: validatedResume.data,
              layoutId,
              sourceHash: context.sourceHash,
              guidelineHash: context.guidelineHash,
            },
            controller.signal,
          );
          const nextUrl = URL.createObjectURL(blob);
          if (cancelled || requestVersion !== requestVersionRef.current) {
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
  }, [resume, layoutId, revision, context, stale]);

  if (!resume || !context || stale) {
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
