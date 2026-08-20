export type GenerationJobStatus = "queued" | "running" | "ready" | "failed";

export type GenerationJobError = {
  code: string;
  message: string;
  retryable: boolean;
};

/**
 * Fields required to create an AI generation job. `payload` is the already-
 * sanitized request snapshot (kind, JD, layout, model). The worker that
 * consumes it re-validates via Zod before calling the model.
 */
export type GenerationJobInsert = {
  jobId: string;
  createdBy: string;
  payload: Record<string, unknown>;
  reservationId: string;
};

export type GenerationJob = GenerationJobInsert & {
  status: GenerationJobStatus;
  /** Persisted CMS generation id once the worker has saved the result. */
  generationId: string | null;
  /** Parsed success payload (mirrors resumeGenerationSuccessSchema). */
  result: Record<string, unknown> | null;
  /** User-safe error, set only when status is "failed". */
  error: GenerationJobError | null;
  createdAt: number;
};

/**
 * Ephemeral store for async AI generation jobs (the admin generate flow).
 * Backed by a short-TTL DynamoDB table in production — jobs are
 * request-scoped artifacts, not durable CMS content, so they're never part of
 * `ContentRepository`. A worker Lambda (SQS-triggered) owns the
 * queued -> running -> ready|failed transitions; the enqueuing API route
 * only creates the job and polls/reads it back.
 */
export type GenerationJobStore = {
  create(job: GenerationJobInsert): Promise<GenerationJob>;
  get(jobId: string): Promise<GenerationJob | null>;
  markRunning(jobId: string): Promise<void>;
  markReady(
    jobId: string,
    generationId: string,
    result: Record<string, unknown>,
  ): Promise<void>;
  markFailed(jobId: string, error: GenerationJobError): Promise<void>;
};
