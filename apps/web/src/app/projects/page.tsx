import type { Metadata } from "next";
import { ProjectsGrid } from "@/components/sections/projects-grid";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "30+ web, mobile, and game projects built with React, Next.js, React Native, AWS, and more.",
};

export default function ProjectsPage() {
  return (
    <div className="py-32">
      <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-padding)]">
        <h1 className="text-[length:var(--text-h1)] font-bold tracking-tight">
          All Projects
        </h1>
        <p className="mt-3 max-w-xl text-[length:var(--text-body-lg)] text-muted-foreground">
          A collection of projects I&apos;ve built throughout my career — from
          serverless cloud systems to educational games.
        </p>
      </div>
      <ProjectsGrid />
    </div>
  );
}
