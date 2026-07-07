import type { Metadata } from "next";
import { ProjectsGrid } from "@/components/sections/projects-grid";
import { fetchAllProjects } from "@/lib/data";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "30+ web, mobile, and game projects built with React, Next.js, React Native, AWS, and more.",
};

export const revalidate = 10;

export default async function ProjectsPage() {
  const projects = await fetchAllProjects();

  return (
    <div className="py-32">
      <div className="max-w-container mx-auto px-(--container-padding)">
        <h1 className="text-h1 font-bold tracking-tight">All Projects</h1>
        <p className="text-body-lg text-muted-foreground mt-3 max-w-xl">
          A collection of projects I&apos;ve built throughout my career — from serverless
          cloud systems to educational games.
        </p>
      </div>
      <ProjectsGrid projects={projects} />
    </div>
  );
}
