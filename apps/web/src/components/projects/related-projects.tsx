import type { Project } from "@portfolio/shared/schemas";
import { ProjectCard } from "./project-card";

export function RelatedProjects({ projects }: { projects: Project[] }) {
  if (projects.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-accent text-lg font-semibold tracking-wider uppercase">
        Related projects
      </h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-3">
        {projects.map((project) => (
          <li key={project.id}>
            <ProjectCard project={project} className="h-full" />
          </li>
        ))}
      </ul>
    </section>
  );
}
