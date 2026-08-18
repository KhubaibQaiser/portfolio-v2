import Link from "next/link";
import type { Project } from "@portfolio/shared/schemas";

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
            <Link
              href={`/projects/${project.slug}`}
              className="border-border/50 bg-muted/20 hover:border-accent/30 block rounded-xl border p-4 transition-colors"
            >
              <p className="font-semibold tracking-tight">{project.title}</p>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {project.summary}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
