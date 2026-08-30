import Link from "next/link";
import type { JobPosting } from "@portfolio/shared/schemas";

type JobRecommendedBannerProps = {
  job: JobPosting;
};

export function JobRecommendedBanner({ job }: JobRecommendedBannerProps) {
  return (
    <div className="border-accent/30 bg-accent/5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-sm">
      <span className="text-accent text-xs font-semibold tracking-wide uppercase">
        Recommended
      </span>
      <span className="text-muted-foreground">{job.company}</span>
      <Link href={`/jobs/${job.id}`} className="text-foreground font-medium hover:underline">
        {job.title}
      </Link>
      <span className="text-muted-foreground text-xs">
        Score {job.score} · {job.band} · {job.status}
      </span>
    </div>
  );
}
