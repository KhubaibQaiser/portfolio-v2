import { getContentRepository } from "@portfolio/data";
import { ProjectsList } from "./projects-list";

export default async function ProjectsListPage() {
  const repo = getContentRepository();
  const [projects, media] = await Promise.all([
    repo.getAllProjects().catch(() => []),
    repo.getMedia().catch(() => []),
  ]);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your portfolio projects. Star to mark as featured.
          </p>
        </div>
      </div>
      <ProjectsList initialData={projects} media={media} />
    </>
  );
}
