import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getContentRepository, getJobBoardRepository } from "@portfolio/data";
import { requireAdmin } from "@/lib/auth-guard";
import { JobDetailActions } from "./job-detail-actions";
import { JobDetailHeader } from "./job-detail-header";
import { JobMatchPanel } from "./job-match-panel";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requireAdmin();
  if (!auth.ok) redirect("/login");

  const { id } = await params;
  const [job, prefs] = await Promise.all([
    getJobBoardRepository().getById(id),
    getContentRepository().getJobPreferences(),
  ]);
  if (!job) notFound();

  const recommended = prefs.recommended_job_id === job.id;

  return (
    <div className="space-y-6">
      <Link
        href={`/jobs?status=${encodeURIComponent(job.status)}`}
        className="text-muted-foreground text-sm hover:underline"
      >
        ← Jobs
      </Link>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
        <div className="space-y-6">
          <JobDetailHeader job={job} recommended={recommended} />

          <div className="lg:hidden">
            <JobMatchPanel job={job} />
          </div>

          <JobDetailActions job={job} />

          {job.recruiter_message ? (
            <section>
              <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Recruiter note
              </h2>
              <pre className="border-border bg-muted/20 mt-2 overflow-auto rounded-lg border p-4 text-sm whitespace-pre-wrap">
                {job.recruiter_message}
              </pre>
            </section>
          ) : null}

          <section>
            <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Job description
            </h2>
            <div className="border-border bg-muted/10 mt-2 rounded-lg border p-4 text-sm whitespace-pre-wrap">
              {job.jd_text}
            </div>
          </section>
        </div>

        <aside className="hidden lg:sticky lg:top-8 lg:block">
          <JobMatchPanel job={job} />
        </aside>
      </div>
    </div>
  );
}
