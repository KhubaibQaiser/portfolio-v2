"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { GitHubIcon } from "@portfolio/ui/icons";
import { cn } from "@/lib/utils";
import type { Project } from "@portfolio/shared/schemas";

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
      className="py-(--section-padding-y)"
      aria-label="Featured Projects"
    >
      <div className="max-w-container mx-auto px-(--container-padding)">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <h2 className="text-h2 flex items-center gap-3 font-semibold tracking-tight">
            <span className="text-accent font-mono text-base font-normal">04.</span>
            Featured Projects
            <span className="bg-border ml-4 h-px flex-1" aria-hidden />
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
                    isOdd && "md:[direction:rtl] md:*:[direction:ltr]",
                  )}
                >
                  <div className="bg-muted relative aspect-video overflow-hidden rounded-xl">
                    {project.cover_url ? (
                      <Image
                        src={project.cover_url}
                        alt={project.title}
                        fill
                        sizes="(min-width: 768px) 50vw, 100vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="text-muted-foreground/30 flex h-full items-center justify-center">
                        Confidential
                      </div>
                    )}
                  </div>

                  <div className={cn(isOdd && "md:text-right")}>
                    <p className="text-accent font-mono text-sm">Featured Project</p>
                    <h3 className="text-h3 mt-1 font-semibold tracking-tight">
                      {project.title}
                    </h3>
                    <div className="bg-muted/50 text-muted-foreground mt-4 rounded-xl p-5 text-sm leading-relaxed">
                      {project.description}
                    </div>
                    <div
                      className={cn(
                        "mt-4 flex flex-wrap gap-2",
                        isOdd && "md:justify-end",
                      )}
                    >
                      {project.tech_tags.map((t) => (
                        <span key={t} className="text-muted-foreground font-mono text-xs">
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
                          className="text-muted-foreground hover:text-foreground transition-colors"
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
                          className="text-muted-foreground hover:text-foreground transition-colors"
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
