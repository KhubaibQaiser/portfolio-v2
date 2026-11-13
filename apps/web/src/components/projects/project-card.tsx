import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Gamepad2, Globe, Smartphone } from "lucide-react";
import { GitHubIcon } from "@portfolio/ui/icons";
import type { Project, ProjectType } from "@portfolio/shared/schemas";
import { cn } from "@/lib/utils";

const MAX_TAGS = 4;

const TYPE_ICONS: Record<ProjectType, typeof Globe> = {
  web: Globe,
  mobile: Smartphone,
  game: Gamepad2,
  "open-source": Globe,
  other: Globe,
};

/**
 * Project card: cover image on top, then title, summary and stack. The whole
 * card is one link (the title link is stretched over it); the GitHub and live
 * icons sit above that layer so they stay separately clickable.
 */
export function ProjectCard({
  project,
  className,
}: {
  project: Project;
  className?: string;
}) {
  const TypeIcon = TYPE_ICONS[project.type];
  const extraTags = project.tech_tags.length - MAX_TAGS;

  return (
    <article
      className={cn(
        "group border-border/50 bg-muted/20 relative flex flex-col overflow-hidden rounded-xl border",
        "hover:border-accent/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        className,
      )}
    >
      <div className="bg-muted relative aspect-[16/10] overflow-hidden">
        {project.cover_url ? (
          <Image
            src={project.cover_url}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div
            aria-hidden
            className="from-accent/15 to-accent/5 text-accent/40 flex h-full w-full items-center justify-center bg-gradient-to-br"
          >
            <TypeIcon className="h-12 w-12" />
          </div>
        )}
        <span className="bg-background/80 text-foreground absolute top-3 left-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize backdrop-blur">
          <TypeIcon className="h-3.5 w-3.5" />
          {project.type.replace("-", " ")}
        </span>
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          {project.github_url && (
            <a
              href={project.github_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${project.title} GitHub`}
              className="bg-background/80 text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full backdrop-blur transition-colors"
            >
              <GitHubIcon className="h-4 w-4" />
            </a>
          )}
          {project.live_url && (
            <a
              href={project.live_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${project.title} Live`}
              className="bg-background/80 text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full backdrop-blur transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-lg font-semibold tracking-tight">
          <Link
            href={`/projects/${project.slug}`}
            className="group-hover:text-accent after:absolute after:inset-0 after:content-['']"
          >
            {project.title}
          </Link>
        </h2>
        <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-relaxed">
          {project.summary}
        </p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
          {project.tech_tags.slice(0, MAX_TAGS).map((t) => (
            <span
              key={t}
              className="bg-accent/10 text-accent rounded-full px-2.5 py-0.5 font-mono text-xs"
            >
              {t}
            </span>
          ))}
          {extraTags > 0 && (
            <span className="text-muted-foreground rounded-full px-1.5 py-0.5 font-mono text-xs">
              +{extraTags}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
