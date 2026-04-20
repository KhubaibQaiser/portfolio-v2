import { createClient } from "@/lib/supabase/server";
import { getProjects } from "@portfolio/shared/supabase/queries";
import { ProjectsList } from "./projects-list";

export default async function ProjectsListPage() {
  const client = await createClient();
  const projects = await getProjects(client).catch(() => []);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your portfolio projects. Star to mark as featured.
          </p>
        </div>
      </div>
      <ProjectsList initialData={projects} />
    </>
  );
}
