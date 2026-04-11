"use client";

import { motion } from "framer-motion";
import { ExternalLink, Github } from "lucide-react";
import { cn } from "@/lib/utils";

type FeaturedProject = {
  title: string;
  description: string;
  tech: string[];
  github?: string;
  live?: string;
  image?: string;
};

const projects: FeaturedProject[] = [
  {
    title: "Shopsense AI Ad Platform",
    description:
      "Serverless ad delivery system on AWS handling 50K+ daily impressions. Built with CDK, Lambda, DynamoDB, and SQS with real-time analytics via CloudFront.",
    tech: ["AWS CDK", "Lambda", "DynamoDB", "SQS", "React", "TypeScript"],
  },
  {
    title: "GudangAda Design System",
    description:
      "Private npm design system adopted by 40+ engineers across 8 product teams. Component library with Storybook documentation and automated visual regression testing.",
    tech: ["React", "TypeScript", "Storybook", "npm", "styled-components"],
  },
  {
    title: "Achieve Web Platform",
    description:
      "Enterprise financial wellness platform. Led CRA→Vite migration (70% faster builds) and React 18 upgrade achieving 60% Core Web Vitals improvement.",
    tech: ["React 18", "Vite", "TypeScript", "React Query", "Tailwind CSS"],
  },
  {
    title: "GudangAda Company Profile",
    description:
      "Public-facing company website built with Next.js, Contentful CMS, and Tailwind CSS. Achieved 70% improvement in Core Web Vitals with SSG and ISR.",
    tech: ["Next.js", "Contentful", "Tailwind CSS", "TypeScript", "Vercel"],
  },
];

const sectionVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function FeaturedProjectsSection() {
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
                  key={project.title}
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
                  {/* Image placeholder */}
                  <div className="aspect-video overflow-hidden rounded-xl bg-muted">
                    <div className="flex h-full items-center justify-center text-muted-foreground/30">
                      Project Screenshot
                    </div>
                  </div>

                  {/* Content */}
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
                      {project.tech.map((t) => (
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
                      {project.github && (
                        <a
                          href={project.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground transition-colors hover:text-foreground"
                          aria-label={`${project.title} GitHub`}
                        >
                          <Github className="h-5 w-5" />
                        </a>
                      )}
                      {project.live && (
                        <a
                          href={project.live}
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
