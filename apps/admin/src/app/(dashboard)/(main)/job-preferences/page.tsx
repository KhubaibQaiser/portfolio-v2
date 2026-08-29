import { redirect } from "next/navigation";
import { getContentRepository } from "@portfolio/data";
import { requireAdmin } from "@/lib/auth-guard";
import { JobPreferencesForm } from "./job-preferences-form";

export const dynamic = "force-dynamic";

export default async function JobPreferencesPage() {
  const auth = await requireAdmin();
  if (!auth.ok) redirect("/login");
  const prefs = await getContentRepository().getJobPreferences();
  const layouts = await getContentRepository()
    .getResumeLayouts()
    .catch(() => []);

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Job preferences</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Hard filters and matcher signals. These also constrain the daily JobsPipe Free
        search so credits are not spent off-preference.
      </p>
      <JobPreferencesForm
        initialData={prefs}
        layouts={layouts.map((layout) => ({ id: layout.id, name: layout.name }))}
      />
    </>
  );
}
