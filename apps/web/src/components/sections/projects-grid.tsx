"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Smartphone, Globe, Gamepad2 } from "lucide-react";
import { GitHubIcon } from "@portfolio/ui/icons";
import type { Project, ProjectType } from "@portfolio/shared/schemas";
import { cn } from "@/lib/utils";

type ProjectsGridProps = {
  projects: Project[];
};

const filters = [
  { label: "All", value: "all" },
  { label: "Web", value: "web", icon: Globe },
  { label: "Mobile", value: "mobile", icon: Smartphone },
  { label: "Games", value: "game", icon: Gamepad2 },
] as const;

type FilterValue = (typeof filters)[number]["value"];

function projectTypeIcon(type: ProjectType) {
  switch (type) {
    case "mobile":
      return Smartphone;
    case "game":
      return Gamepad2;
    default:
      return Globe;
  }
}

export function ProjectsGrid({ projects }: ProjectsGridProps) {
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");

  const filtered =
    activeFilter === "all" ? projects : projects.filter((p) => p.type === activeFilter);

  return (
    <div className="max-w-container mx-auto px-(--container-padding) pt-10">
      <div className="flex flex-wrap gap-2">
        {filters.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveFilter(value)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200",
              activeFilter === value
                ? "bg-accent text-accent-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <motion.div layout className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((project) => {
            const TypeIcon = projectTypeIcon(project.type);

            return (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
                className={cn(
                  "group border-border/50 bg-muted/20 flex flex-col rounded-xl border p-6",
                  "hover:border-accent/30 transition-all duration-300 hover:shadow-md",
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="bg-accent/10 flex h-10 w-10 items-center justify-center rounded-lg">
                    <TypeIcon className="text-accent h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-3">
                    {project.github_url && (
                      <a
                        href={project.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={`${project.title} GitHub`}
                      >
                        <GitHubIcon className="h-4 w-4" />
                      </a>
                    )}
                    {project.live_url && (
                      <a
                        href={project.live_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={`${project.title} Live`}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
                <Link href={`/projects/${project.slug}`} className="mt-4 flex-1">
                  <h2 className="group-hover:text-accent text-lg font-semibold tracking-tight">
                    {project.title}
                  </h2>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {project.summary}
                  </p>
                </Link>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {project.tech_tags.map((t) => (
                    <span key={t} className="text-muted-foreground/70 font-mono text-xs">
                      {t}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
