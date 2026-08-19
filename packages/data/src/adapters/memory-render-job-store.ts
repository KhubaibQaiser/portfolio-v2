import type { RenderJob, RenderJobInsert, RenderJobStore } from "@portfolio/shared/ports";

/**
 * In-memory {@link RenderJobStore} for fixture/local development and tests.
 * No TTL sweep is needed — the process is short-lived (dev server or a test
 * run), so jobs simply live for the process's lifetime.
 */
export function createMemoryRenderJobStore(): RenderJobStore {
  const jobs = new Map<string, RenderJob>();

  return {
    async create(job: RenderJobInsert): Promise<RenderJob> {
      const record: RenderJob = {
        ...job,
        status: "queued",
        objectKey: null,
        error: null,
        fitReport: null,
        createdAt: Date.now(),
      };
      jobs.set(job.jobId, record);
      return record;
    },

    async get(jobId: string): Promise<RenderJob | null> {
      return jobs.get(jobId) ?? null;
    },

    async markRendering(jobId: string): Promise<void> {
      const job = jobs.get(jobId);
      if (job) jobs.set(jobId, { ...job, status: "rendering" });
    },

    async markReady(
      jobId: string,
      objectKey: string,
      fitReport: Record<string, unknown> | null = null,
    ): Promise<void> {
      const job = jobs.get(jobId);
      if (job) jobs.set(jobId, { ...job, status: "ready", objectKey, fitReport });
    },

    async markFailed(jobId: string, error: string): Promise<void> {
      const job = jobs.get(jobId);
      if (job) jobs.set(jobId, { ...job, status: "failed", error });
    },
  };
}
