"use client";

import { useEffect, useRef, useState } from "react";
import type { TailoredResume } from "@portfolio/ai/schemas";
import { cn } from "@/lib/utils";

type Props = {
  resume: TailoredResume | null;
  layoutId: string;
  revision: number;
};

const PREVIEW_DEBOUNCE_MS = 600;

export function ResumePdfPreview({ resume, layoutId, revision }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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
          const blob = await res.blob();
          const nextUrl = URL.createObjectURL(blob);
          if (cancelled) {
            URL.revokeObjectURL(nextUrl);
            return;
          }
          if (urlRef.current) URL.revokeObjectURL(urlRef.current);
          urlRef.current = nextUrl;
          setUrl(nextUrl);
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
      <iframe
        title="Resume PDF preview"
        src={url}
        className={cn("border-border h-160 w-full rounded-lg border bg-white")}
      />
    </div>
  );
}
