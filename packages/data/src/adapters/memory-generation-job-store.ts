import type {
  GenerationJob,
  GenerationJobError,
  GenerationJobInsert,
  GenerationJobStore,
} from "@portfolio/shared/ports";

/**
 * In-memory {@link GenerationJobStore} for fixture/local development and tests.
 * No TTL sweep is needed — the process is short-lived (dev server or a test
 * run), so jobs simply live for the process's lifetime.
 */
export function createMemoryGenerationJobStore(): GenerationJobStore {
  const jobs = new Map<string, GenerationJob>();

  return {
    async create(job: GenerationJobInsert): Promise<GenerationJob> {
      const record: GenerationJob = {
        ...job,
        status: "queued",
        generationId: null,
        result: null,
        error: null,
        createdAt: Date.now(),
      };
      jobs.set(job.jobId, record);
      return record;
    },

    async get(jobId: string): Promise<GenerationJob | null> {
      return jobs.get(jobId) ?? null;
    },

    async markRunning(jobId: string): Promise<void> {
      const job = jobs.get(jobId);
      if (job) jobs.set(jobId, { ...job, status: "running" });
    },

    async markReady(
      jobId: string,
      generationId: string,
      result: Record<string, unknown>,
    ): Promise<void> {
      const job = jobs.get(jobId);
      if (job) {
        jobs.set(jobId, { ...job, status: "ready", generationId, result });
      }
    },

    async markFailed(jobId: string, error: GenerationJobError): Promise<void> {
      const job = jobs.get(jobId);
      if (job) jobs.set(jobId, { ...job, status: "failed", error });
    },
  };
}
