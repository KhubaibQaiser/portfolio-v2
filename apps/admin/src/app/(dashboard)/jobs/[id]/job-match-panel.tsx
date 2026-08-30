import type { JobPosting } from "@portfolio/shared/schemas";
import { JobBandPill } from "../job-band-pill";
import { formatGapLabel, formatSalary } from "../job-format";

type JobMatchPanelProps = {
  job: JobPosting;
};

export function JobMatchPanel({ job }: JobMatchPanelProps) {
  const salary = formatSalary(job);
  const gaps = job.gaps.map(formatGapLabel).filter(Boolean);

  return (
    <div className="border-border bg-muted/10 space-y-4 rounded-lg border p-4">
      <div>
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Match
        </h2>
        <div className="mt-2">
          <JobBandPill score={job.score} band={job.band} className="text-sm" />
        </div>
      </div>

      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Status</dt>
          <dd className="capitalize">{job.status}</dd>
        </div>
        {job.remote ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Arrangement</dt>
            <dd>Remote</dd>
          </div>
        ) : null}
        {salary ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Salary</dt>
            <dd className="text-right">{salary}</dd>
          </div>
        ) : null}
        {job.follow_up_at ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Follow-up</dt>
            <dd>{job.follow_up_at.slice(0, 10)}</dd>
          </div>
        ) : null}
      </dl>

      {gaps.length > 0 ? (
        <div>
          <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Gaps
          </h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {gaps.map((gap) => (
              <li
                key={gap}
                className="border-border bg-background rounded-md border px-2 py-0.5 text-xs"
              >
                {gap}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
