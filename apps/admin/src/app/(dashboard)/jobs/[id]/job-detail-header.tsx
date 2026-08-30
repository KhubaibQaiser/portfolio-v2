import type { JobPosting } from "@portfolio/shared/schemas";
import { JobBandPill } from "../job-band-pill";
import { formatSalary } from "../job-format";

type JobDetailHeaderProps = {
  job: JobPosting;
  recommended: boolean;
};

export function JobDetailHeader({ job, recommended }: JobDetailHeaderProps) {
  const salary = formatSalary(job);
  const source = job.sources[0]?.source;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="border-border bg-muted/30 rounded-md border px-2 py-0.5 text-xs font-medium capitalize">
          {job.status}
        </span>
        <JobBandPill score={job.score} band={job.band} />
        {recommended ? (
          <span className="border-accent/40 bg-accent/10 text-accent rounded-md border px-2 py-0.5 text-xs font-semibold tracking-wide uppercase">
            Recommended
          </span>
        ) : null}
        {job.remote ? (
          <span className="border-border text-muted-foreground rounded-md border px-2 py-0.5 text-xs tracking-wide uppercase">
            Remote
          </span>
        ) : null}
      </div>

      <div>
        <p className="text-muted-foreground text-sm">{job.company}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{job.title}</h1>
      </div>

      <dl className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {job.location ? (
          <div>
            <dt className="sr-only">Location</dt>
            <dd>{job.location}</dd>
          </div>
        ) : null}
        {source ? (
          <div>
            <dt className="sr-only">Source</dt>
            <dd className="capitalize">{source}</dd>
          </div>
        ) : null}
        <div>
          <dt className="sr-only">Posted</dt>
          <dd>Posted {job.posted_at.slice(0, 10)}</dd>
        </div>
        {salary ? (
          <div>
            <dt className="sr-only">Salary</dt>
            <dd>{salary}</dd>
          </div>
        ) : null}
        {job.follow_up_at ? (
          <div>
            <dt className="sr-only">Follow-up</dt>
            <dd>Follow-up {job.follow_up_at.slice(0, 10)}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
