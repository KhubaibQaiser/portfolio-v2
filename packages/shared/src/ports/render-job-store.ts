export type RenderJobKind = "resume" | "cover_letter";
export type RenderJobStatus = "queued" | "rendering" | "ready" | "failed";

/**
 * Fields required to create a render job. `payload` is intentionally left
 * structurally open (mirrors `ResumeGeneration.resume`/`cover_letter` in
 * content-repository.ts) so this port doesn't depend on the AI package's
 * schemas — the worker that consumes it knows how to interpret it based on
 * `kind`. The caller must have already fully validated/sanitized/policy-
 * enforced the payload; the worker only renders it.
 */
export type RenderJobInsert = {
  jobId: string;
  createdBy: string;
  generationId: string;
  kind: RenderJobKind;
  payload: Record<string, unknown>;
  /** Desired download filename (without any path), e.g. "Jane-Doe-Resume.pdf". */
  filename: string;
};

export type RenderJob = RenderJobInsert & {
  status: RenderJobStatus;
  /** Media-store object key once the PDF has been rendered and uploaded. */
  objectKey: string | null;
  /** User-safe error message, set only when status is "failed". */
  error: string | null;
  /** Opaque fit-report (see `@portfolio/ui/resume-pdf`'s `FitReport`), set only for "resume" jobs. */
  fitReport: Record<string, unknown> | null;
  createdAt: number;
};

/**
 * Ephemeral store for async PDF render jobs (the admin "Download PDF" flow).
 * Backed by a short-TTL DynamoDB table in production — jobs are
 * request-scoped artifacts, not durable CMS content, so they're never part of
 * `ContentRepository`. A worker Lambda (SQS-triggered) owns the
 * queued -> rendering -> ready|failed transitions; the enqueuing API route
 * only creates the job and polls/reads it back.
 */
export type RenderJobStore = {
  /** Creates a new job in "queued" status. */
  create(job: RenderJobInsert): Promise<RenderJob>;
  /** Reads a job by id. Returns null when it doesn't exist or has expired. */
  get(jobId: string): Promise<RenderJob | null>;
  /** Best-effort progress marker; not required for correctness. */
  markRendering(jobId: string): Promise<void>;
  /** Marks a job done and records where its PDF bytes live. */
  markReady(
    jobId: string,
    objectKey: string,
    fitReport?: Record<string, unknown> | null,
  ): Promise<void>;
  /** Marks a job permanently failed with a user-safe message. */
  markFailed(jobId: string, error: string): Promise<void>;
};
