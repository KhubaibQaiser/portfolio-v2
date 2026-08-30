import type {
  JobBoardRepository,
  JobQueryByStatusOptions,
  JobQueryPage,
  JobStatusCounts,
} from "@portfolio/shared/ports";
import {
  HITL_STATUSES,
  jobPostingRowSchema,
  jobStatusEnum,
  type JobPosting,
  type JobStatus,
} from "@portfolio/shared/schemas";

function clone(row: JobPosting): JobPosting {
  return jobPostingRowSchema.parse(structuredClone(row));
}

function mergeSources(existing: JobPosting, incoming: JobPosting): JobPosting["sources"] {
  const seen = new Set(existing.sources.map((s) => `${s.source}:${s.source_id}`));
  const merged = [...existing.sources];
  for (const source of incoming.sources) {
    const key = `${source.source}:${source.source_id}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(source);
    }
  }
  return merged.slice(0, 12);
}

function emptyCounts(): JobStatusCounts {
  return Object.fromEntries(jobStatusEnum.options.map((status) => [status, 0])) as JobStatusCounts;
}

export function createMemoryJobBoardRepository(): JobBoardRepository {
  const rows = new Map<string, JobPosting>();

  return {
    async getById(id) {
      const row = rows.get(id);
      return row ? clone(row) : null;
    },

    async upsertCanonical(incoming) {
      const existing = rows.get(incoming.id);
      const timestamp = new Date().toISOString();
      if (!existing) {
        const created = clone({
          ...incoming,
          created_at: timestamp,
          updated_at: timestamp,
        });
        rows.set(created.id, created);
        return clone(created);
      }
      const hitl = HITL_STATUSES.has(existing.status);
      const next: JobPosting = {
        ...existing,
        company: incoming.company,
        company_domain: incoming.company_domain ?? existing.company_domain,
        title: incoming.title,
        location: incoming.location,
        remote: incoming.remote,
        salary_min: incoming.salary_min ?? existing.salary_min,
        salary_max: incoming.salary_max ?? existing.salary_max,
        salary_currency: incoming.salary_currency ?? existing.salary_currency,
        jd_text:
          incoming.jd_text.length > existing.jd_text.length
            ? incoming.jd_text
            : existing.jd_text,
        sources: mergeSources(existing, incoming),
        score: incoming.score,
        band: incoming.band,
        gaps: incoming.gaps,
        posted_at: incoming.posted_at,
        status: hitl ? existing.status : existing.status,
        notified_at: existing.notified_at,
        digested_at: existing.digested_at,
        follow_up_at: existing.follow_up_at,
        snooze_count: existing.snooze_count,
        generation_id: existing.generation_id,
        recruiter_message: existing.recruiter_message,
        updated_at: timestamp,
      };
      rows.set(next.id, next);
      return clone(next);
    },

    async update(id, patch) {
      const existing = rows.get(id);
      if (!existing) return null;
      const next = clone({
        ...existing,
        ...patch,
        id: existing.id,
        updated_at: new Date().toISOString(),
      });
      rows.set(id, next);
      return clone(next);
    },

    async claimNotify(id, notifiedAt) {
      const existing = rows.get(id);
      if (!existing || existing.notified_at) return false;
      rows.set(id, { ...existing, notified_at: notifiedAt, updated_at: notifiedAt });
      return true;
    },

    async claimDigest(id, digestedAt) {
      const existing = rows.get(id);
      if (!existing || existing.digested_at) return false;
      rows.set(id, { ...existing, digested_at: digestedAt, updated_at: digestedAt });
      return true;
    },

    async queryByStatus(options: JobQueryByStatusOptions): Promise<JobQueryPage> {
      const limit = options.limit ?? 50;
      const sorted = [...rows.values()]
        .filter((row) => row.status === options.status)
        .filter((row) => (options.band ? row.band === options.band : true))
        .sort(
          (a, b) => b.posted_at.localeCompare(a.posted_at) || b.id.localeCompare(a.id),
        );
      let start = 0;
      if (options.cursor) {
        start =
          sorted.findIndex(
            (row) =>
              row.id === options.cursor?.id && row.posted_at === options.cursor.posted_at,
          ) + 1;
        if (start < 1) start = 0;
      }
      const page = sorted.slice(start, start + limit);
      const last = page.at(-1);
      const hasMore = start + page.length < sorted.length;
      return {
        items: page.map(clone),
        nextCursor:
          hasMore && last
            ? { status: last.status, posted_at: last.posted_at, id: last.id }
            : null,
      };
    },

    async countByStatus(): Promise<JobStatusCounts> {
      const counts = emptyCounts();
      for (const row of rows.values()) {
        counts[row.status as JobStatus] += 1;
      }
      return counts;
    },
  };
}
