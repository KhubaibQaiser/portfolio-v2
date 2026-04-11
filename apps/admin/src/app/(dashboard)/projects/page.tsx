"use client";

import Link from "next/link";
import { Plus, GripVertical, Pencil, Trash2, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const projects = [
  { id: "1", title: "Shopsense AI Ad Platform", type: "web", featured: true },
  { id: "2", title: "GudangAda Design System", type: "web", featured: true },
  { id: "3", title: "Achieve Web Platform", type: "web", featured: true },
  { id: "4", title: "GudangAda Company Profile", type: "web", featured: true },
  { id: "5", title: "Tradeblock Trading App", type: "mobile", featured: false },
  { id: "6", title: "STOQO Driver App", type: "mobile", featured: false },
  { id: "7", title: "Transport Management System", type: "web", featured: false },
  { id: "8", title: "Martian Multiples", type: "game", featured: false },
];

export default function ProjectsListPage() {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your portfolio projects. Star to mark as featured.
          </p>
        </div>
        <Link
          href="/projects/new"
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
        >
          <Plus className="h-4 w-4" />
          Add Project
        </Link>
      </div>

      <div className="mt-6 space-y-2">
        {projects.map((project) => (
          <div
            key={project.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 p-4",
              "transition-colors hover:border-accent/20",
            )}
          >
            <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground/40" />
            <Star
              className={cn(
                "h-4 w-4",
                project.featured
                  ? "fill-amber-500 text-amber-500"
                  : "text-muted-foreground/30",
              )}
            />
            <div className="flex-1">
              <p className="font-medium">{project.title}</p>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {project.type}
              </span>
            </div>
            <Link
              href={`/projects/${project.id}`}
              className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Pencil className="h-4 w-4" />
            </Link>
            <button className="rounded-md p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-500">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
