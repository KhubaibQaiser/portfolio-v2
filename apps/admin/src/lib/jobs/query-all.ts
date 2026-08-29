import type { JobBoardRepository } from "@portfolio/shared/ports";
import type { JobPosting, JobStatus } from "@portfolio/shared/schemas";

export async function queryAllByStatus(
  jobs: JobBoardRepository,
  status: JobStatus,
): Promise<JobPosting[]> {
  const items: JobPosting[] = [];
  let cursor: { status: string; posted_at: string; id: string } | undefined;
  do {
    const page = await jobs.queryByStatus({ status, limit: 50, cursor });
    items.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return items;
}
