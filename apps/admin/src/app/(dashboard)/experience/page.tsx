"use client";

import Link from "next/link";
import { Plus, GripVertical, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const experiences = [
  { id: "1", company: "Shopsense AI", role: "Senior Software Engineer", period: "Aug 2024 – Present" },
  { id: "2", company: "Achieve", role: "Senior Web Developer", period: "Jun 2023 – Aug 2024" },
  { id: "3", company: "Tradeblock.us", role: "Senior RN Engineer", period: "Jan 2023 – Jun 2023" },
  { id: "4", company: "GudangAda", role: "Senior Software Engineer", period: "Sep 2020 – Jan 2023" },
  { id: "5", company: "STOQO", role: "Senior Software Engineer", period: "Feb 2019 – Aug 2020" },
  { id: "6", company: "Knowledge Platform", role: "Mobile App & Game Developer", period: "Sep 2015 – Feb 2019" },
];

export default function ExperienceListPage() {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Experience</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your work experience entries. Drag to reorder.
          </p>
        </div>
        <Link
          href="/experience/new"
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
        >
          <Plus className="h-4 w-4" />
          Add
        </Link>
      </div>

      <div className="mt-6 space-y-2">
        {experiences.map((exp) => (
          <div
            key={exp.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 p-4",
              "transition-colors hover:border-accent/20",
            )}
          >
            <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground/40" />
            <div className="flex-1">
              <p className="font-medium">{exp.role}</p>
              <p className="text-sm text-muted-foreground">
                {exp.company} · {exp.period}
              </p>
            </div>
            <Link
              href={`/experience/${exp.id}`}
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
