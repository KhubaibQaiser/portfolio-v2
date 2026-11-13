"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, Globe, Gamepad2 } from "lucide-react";
import type { Project } from "@portfolio/shared/schemas";
import { ProjectCard } from "@/components/projects/project-card";
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
          {filtered.map((project) => (
            <motion.div
              key={project.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
            >
              <ProjectCard project={project} className="h-full" />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
