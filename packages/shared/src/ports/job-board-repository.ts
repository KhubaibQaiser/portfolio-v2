import type { JobBand, JobPosting, JobStatus } from "../schemas/job-posting";

export type JobListCursor = {
  status: string;
  posted_at: string;
  id: string;
};

export type JobQueryByStatusOptions = {
  status: JobStatus;
  limit?: number;
  cursor?: JobListCursor;
  /** Soft client filter; applied after the status GSI query. */
  band?: JobBand;
};

export type JobQueryPage = {
  items: JobPosting[];
  nextCursor: JobListCursor | null;
};

export type JobStatusCounts = Record<JobStatus, number>;

/**
 * Persistence for canonical job postings. Preferences live on
 * {@link ContentRepository}, not here.
 */
export type JobBoardRepository = {
  getById(id: string): Promise<JobPosting | null>;
  upsertCanonical(row: JobPosting): Promise<JobPosting>;
  update(id: string, patch: Partial<JobPosting>): Promise<JobPosting | null>;
  /**
   * Sets `notified_at` only when it is currently unset. Returns true when this
   * caller won the write (and should send mail).
   */
  claimNotify(id: string, notifiedAt: string): Promise<boolean>;
  /**
   * Sets `digested_at` only when it is currently unset. Returns true when this
   * caller won the write (and should include the row in the morning digest).
   */
  claimDigest(id: string, digestedAt: string): Promise<boolean>;
  queryByStatus(options: JobQueryByStatusOptions): Promise<JobQueryPage>;
  /** Per-status counts via the status GSI (no band filter). */
  countByStatus(): Promise<JobStatusCounts>;
};
