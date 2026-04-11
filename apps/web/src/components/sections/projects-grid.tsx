"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Smartphone, Globe, Gamepad2 } from "lucide-react";
import { GitHubIcon } from "@portfolio/ui/icons";
import { cn } from "@/lib/utils";

type ProjectItem = {
  title: string;
  description: string;
  tech: string[];
  type: "web" | "mobile" | "game";
  github?: string;
  live?: string;
};

const allProjects: ProjectItem[] = [
  {
    title: "Shopsense AI Ad Platform",
    description: "Serverless ad delivery system on AWS handling 50K+ daily impressions.",
    tech: ["AWS CDK", "Lambda", "DynamoDB", "React"],
    type: "web",
  },
  {
    title: "Achieve Web Platform",
    description: "Financial wellness platform with React 18 and 60% CWV improvement.",
    tech: ["React 18", "Vite", "TypeScript", "React Query"],
    type: "web",
  },
  {
    title: "Tradeblock Trading App",
    description:
      "Cross-platform sneaker trading app with shared React Native + web codebase.",
    tech: ["React Native", "Next.js", "Apollo GraphQL"],
    type: "mobile",
  },
  {
    title: "GudangAda Design System",
    description: "Private npm component library used by 40+ engineers across 8 teams.",
    tech: ["React", "Storybook", "styled-components", "npm"],
    type: "web",
  },
  {
    title: "GudangAda Company Profile",
    description: "Next.js + Contentful website with 70% Core Web Vitals improvement.",
    tech: ["Next.js", "Contentful", "Tailwind CSS"],
    type: "web",
  },
  {
    title: "STOQO Driver App",
    description: "React Native driver tracking app, later rewritten in native Kotlin.",
    tech: ["React Native", "Kotlin", "Google Maps"],
    type: "mobile",
  },
  {
    title: "Transport Management System",
    description: "Dashboard for logistics operations with real-time driver tracking.",
    tech: ["React", "Node.js", "PostgreSQL", "Maps"],
    type: "web",
  },
  {
    title: "Geo Dashboard",
    description: "Geographic data visualization dashboard with interactive maps.",
    tech: ["React", "D3.js", "Leaflet", "Node.js"],
    type: "web",
  },
  {
    title: "CERP Survey App",
    description: "Cross-platform survey application for economic research in Pakistan.",
    tech: ["Cordova", "JavaScript", "SQLite"],
    type: "mobile",
  },
  {
    title: "Martian Multiples",
    description: "Educational math game reaching 500K+ students across Pakistan.",
    tech: ["EaselJS", "HTML5 Canvas", "JavaScript"],
    type: "game",
  },
  {
    title: "Maze Runner",
    description: "Interactive educational puzzle game for K-12 students.",
    tech: ["HTML5 Canvas", "JavaScript", "EaselJS"],
    type: "game",
  },
  {
    title: "Number Battle",
    description: "Competitive math game for classroom learning environments.",
    tech: ["EaselJS", "HTML5 Canvas", "JavaScript"],
    type: "game",
  },
];

const filters = [
  { label: "All", value: "all" },
  { label: "Web", value: "web", icon: Globe },
  { label: "Mobile", value: "mobile", icon: Smartphone },
  { label: "Games", value: "game", icon: Gamepad2 },
] as const;

type FilterValue = (typeof filters)[number]["value"];

export function ProjectsGrid() {
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");

  const filtered =
    activeFilter === "all"
      ? allProjects
      : allProjects.filter((p) => p.type === activeFilter);

  return (
    <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-padding)] pt-10">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {filters.map(({ label, value }) => (
          <button
            key={value}
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

      {/* Grid */}
      <motion.div layout className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((project) => (
            <motion.div
              key={project.title}
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
                  {project.type === "web" && <Globe className="text-accent h-5 w-5" />}
                  {project.type === "mobile" && (
                    <Smartphone className="text-accent h-5 w-5" />
                  )}
                  {project.type === "game" && (
                    <Gamepad2 className="text-accent h-5 w-5" />
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {project.github && (
                    <a
                      href={project.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={`${project.title} GitHub`}
                    >
                      <GitHubIcon className="h-4 w-4" />
                    </a>
                  )}
                  {project.live && (
                    <a
                      href={project.live}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={`${project.title} Live`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
              <h3 className="group-hover:text-accent mt-4 text-lg font-semibold tracking-tight">
                {project.title}
              </h3>
              <p className="text-muted-foreground mt-2 flex-1 text-sm leading-relaxed">
                {project.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {project.tech.map((t) => (
                  <span key={t} className="text-muted-foreground/70 font-mono text-xs">
                    {t}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
