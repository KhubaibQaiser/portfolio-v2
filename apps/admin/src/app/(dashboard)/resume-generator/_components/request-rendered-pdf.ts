import type { CoverLetter, TailoredResume } from "@portfolio/ai/schemas";
import type { FitReport } from "@portfolio/ui/resume-pdf";

export type RenderJobRequestBody =
  | {
      kind: "resume";
      generationId: string;
      resume: TailoredResume;
      layoutId: string;
      sourceHash: string;
      guidelineHash: string;
    }
  | {
      kind: "cover_letter";
      generationId: string;
      coverLetter: CoverLetter;
      meta?: { company?: string; role?: string };
    };

export type RenderedPdf = {
  blob: Blob;
  filename: string;
  fitReport: FitReport | null;
};

/** Thrown for both enqueue-time validation failures and terminal render-job
 * failures, so both call sites can keep their existing `err.message` UX. */
export class RenderJobError extends Error {}

const POLL_INTERVAL_MS = 1000;
// The worker's own budget is generous (minutes), but a UI waiting on a
// spinner shouldn't hang indefinitely — matches the old synchronous route's
// effective ~60s ceiling from the client's point of view.
const MAX_POLL_MS = 60_000;

async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  const json: unknown = await res.json().catch(() => null);
  return typeof json === "object" &&
    json !== null &&
    "error" in json &&
    typeof json.error === "object" &&
    json.error !== null &&
    "message" in json.error &&
    typeof json.error.message === "string"
    ? json.error.message
    : fallback;
}

/**
 * Enqueues a render job for a tailored resume or cover letter, polls its
 * status, and resolves with the rendered PDF bytes once ready. Replaces the
 * old direct `POST /api/resume/export` -> PDF-bytes call now that rendering
 * happens on a worker off the request path.
 */
export async function requestRenderedPdf(
  body: RenderJobRequestBody,
  signal?: AbortSignal,
): Promise<RenderedPdf> {
  const enqueueRes = await fetch("/api/resume/export", {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!enqueueRes.ok) {
    throw new RenderJobError(await extractErrorMessage(enqueueRes, "PDF export failed"));
  }
  const enqueued: unknown = await enqueueRes.json();
  if (
    typeof enqueued !== "object" ||
    enqueued === null ||
    !("jobId" in enqueued) ||
    typeof enqueued.jobId !== "string"
  ) {
    throw new RenderJobError("PDF export failed to start");
  }
  const jobId = enqueued.jobId;

  const deadline = Date.now() + MAX_POLL_MS;
  let fitReport: FitReport | null = null;
  for (;;) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const statusRes = await fetch(`/api/resume/export/status?jobId=${jobId}`, { signal });
    if (!statusRes.ok) {
      throw new RenderJobError(await extractErrorMessage(statusRes, "PDF export failed"));
    }
    const statusJson = (await statusRes.json()) as {
      status: "queued" | "rendering" | "ready" | "failed";
      error: string | null;
      fitReport: FitReport | null;
    };
    if (statusJson.status === "ready") {
      fitReport = statusJson.fitReport;
      break;
    }
    if (statusJson.status === "failed") {
      throw new RenderJobError(statusJson.error ?? "PDF export failed");
    }
    if (Date.now() >= deadline) {
      throw new RenderJobError(
        "PDF export is taking longer than expected. Try again shortly.",
      );
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  const downloadRes = await fetch(`/api/resume/export/download?jobId=${jobId}`, {
    signal,
  });
  if (!downloadRes.ok) {
    throw new RenderJobError(await extractErrorMessage(downloadRes, "PDF export failed"));
  }
  const filename =
    /filename="([^"]+)"/.exec(
      downloadRes.headers.get("Content-Disposition") ?? "",
    )?.[1] ?? "resume.pdf";
  return { blob: await downloadRes.blob(), filename, fitReport };
}
