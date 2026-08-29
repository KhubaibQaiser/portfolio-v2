import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getJobBoardRepository } from "@portfolio/data";
import { requireAdmin } from "@/lib/auth-guard";
import { JobDetailActions } from "./job-detail-actions";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requireAdmin();
  if (!auth.ok) redirect("/login");

  const { id } = await params;
  const job = await getJobBoardRepository().getById(id);
  if (!job) notFound();

  return (
    <div className="space-y-6">
      <Link href="/jobs" className="text-muted-foreground text-sm hover:underline">
        ← Jobs
      </Link>
      <div>
        <p className="text-muted-foreground text-sm">
          {job.company} · {job.location} · {job.sources[0]?.source}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{job.title}</h1>
        <p className="mt-2 text-sm">
          Score {job.score} ({job.band}) · status {job.status}
          {job.follow_up_at ? ` · follow-up ${job.follow_up_at.slice(0, 10)}` : ""}
        </p>
      </div>
      <JobDetailActions job={job} />
      {job.gaps.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold tracking-wide uppercase">Gaps</h2>
          <ul className="mt-2 list-inside list-disc text-sm">
            {job.gaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {job.recruiter_message ? (
        <section>
          <h2 className="text-sm font-semibold tracking-wide uppercase">
            Recruiter note
          </h2>
          <pre className="border-border bg-muted/20 mt-2 overflow-auto rounded-lg border p-4 text-sm whitespace-pre-wrap">
            {job.recruiter_message}
          </pre>
        </section>
      ) : null}
      <section>
        <h2 className="text-sm font-semibold tracking-wide uppercase">Job description</h2>
        <div className="border-border bg-muted/10 mt-2 max-h-[480px] overflow-auto rounded-lg border p-4 text-sm whitespace-pre-wrap">
          {job.jd_text}
        </div>
      </section>
    </div>
  );
}
