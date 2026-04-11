"use client";

import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { GitHubIcon } from "@portfolio/ui/icons";
import { cn } from "@/lib/utils";
import type { Database } from "@portfolio/shared/supabase/database.types";

type Project = Database["public"]["Tables"]["projects"]["Row"];

type FeaturedProjectsSectionProps = {
  projects: Project[];
};

const sectionVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function FeaturedProjectsSection({ projects }: FeaturedProjectsSectionProps) {
  return (
    <section
      id="projects"
      className="py-[var(--section-padding-y)]"
      aria-label="Featured Projects"
    >
      <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-padding)]">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <h2 className="flex items-center gap-3 text-[length:var(--text-h2)] font-semibold tracking-tight">
            <span className="font-mono text-base font-normal text-accent">
              04.
            </span>
            Featured Projects
            <span className="ml-4 h-px flex-1 bg-border" aria-hidden />
          </h2>

          <div className="mt-10 space-y-20">
            {projects.map((project, i) => {
              const isOdd = i % 2 !== 0;

              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{
                    delay: 0.1,
                    duration: 0.6,
                    ease: [0.22, 1, 0.36, 1] as const,
                  }}
                  className={cn(
                    "grid items-center gap-8 md:grid-cols-[1fr_1fr]",
                    isOdd && "md:[direction:rtl] md:[&>*]:[direction:ltr]",
                  )}
                >
                  <div className="aspect-video overflow-hidden rounded-xl bg-muted">
                    {project.cover_url ? (
                      <img src={project.cover_url} alt={project.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground/30">
                        Project Screenshot
                      </div>
                    )}
                  </div>

                  <div className={cn(isOdd && "md:text-right")}>
                    <p className="font-mono text-sm text-accent">
                      Featured Project
                    </p>
                    <h3 className="mt-1 text-[length:var(--text-h3)] font-semibold tracking-tight">
                      {project.title}
                    </h3>
                    <div className="mt-4 rounded-xl bg-muted/50 p-5 text-sm leading-relaxed text-muted-foreground">
                      {project.description}
                    </div>
                    <div
                      className={cn(
                        "mt-4 flex flex-wrap gap-2",
                        isOdd && "md:justify-end",
                      )}
                    >
                      {project.tech_tags.map((t) => (
                        <span
                          key={t}
                          className="font-mono text-xs text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <div
                      className={cn(
                        "mt-4 flex items-center gap-4",
                        isOdd && "md:justify-end",
                      )}
                    >
                      {project.github_url && (
                        <a
                          href={project.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground transition-colors hover:text-foreground"
                          aria-label={`${project.title} GitHub`}
                        >
                          <GitHubIcon className="h-5 w-5" />
                        </a>
                      )}
                      {project.live_url && (
                        <a
                          href={project.live_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground transition-colors hover:text-foreground"
                          aria-label={`${project.title} Live Demo`}
                        >
                          <ExternalLink className="h-5 w-5" />
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
