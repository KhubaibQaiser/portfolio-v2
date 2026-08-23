"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ResumeLayout } from "@portfolio/shared/schemas";
import {
  createResumeLayoutFromTemplate,
  deleteResumeLayout,
  setDefaultResumeLayout,
} from "@/lib/actions";
import { useToast } from "@/components/toast/toast-provider";
import { runServerAction } from "@/lib/run-server-action";
import { LayoutCard } from "./layout-card";

type Props = {
  initialData: ResumeLayout[];
};

export function LayoutsList({ initialData }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState<
    "classic" | "modern-blue" | "ats-resume" | null
  >(null);

  async function clone(template: "classic" | "modern-blue" | "ats-resume") {
    setCreating(template);
    const result = await createResumeLayoutFromTemplate(template);
    setCreating(null);
    if (result.success && result.id) {
      toast.success("Layout created");
      router.push(`/resume-layouts/${result.id}`);
      return;
    }
    toast.error(result.success ? "Layout created without an id" : result.error);
  }

  async function setDefault(id: string) {
    setBusyId(id);
    const result = await runServerAction(() => setDefaultResumeLayout(id), toast);
    setBusyId(null);
    if (result.success) router.refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this layout? This cannot be undone.")) return;
    setBusyId(id);
    const result = await runServerAction(() => deleteResumeLayout(id), toast);
    setBusyId(null);
    if (result.success) router.refresh();
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void clone("classic")}
          disabled={creating !== null}
          className="border-border bg-muted/30 hover:bg-muted/50 rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          {creating === "classic" ? "Cloning…" : "Clone Classic"}
        </button>
        <button
          type="button"
          onClick={() => void clone("modern-blue")}
          disabled={creating !== null}
          className="border-border bg-muted/30 hover:bg-muted/50 rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          {creating === "modern-blue" ? "Cloning…" : "Clone Modern Blue"}
        </button>
        <button
          type="button"
          onClick={() => void clone("ats-resume")}
          disabled={creating !== null}
          className="border-border bg-muted/30 hover:bg-muted/50 rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          {creating === "ats-resume" ? "Cloning…" : "Clone ATS Resume"}
        </button>
      </div>
      {initialData.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No layouts yet. Clone Classic, Modern Blue, or ATS Resume to get started.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {initialData.map((layout) => (
            <LayoutCard
              key={layout.id}
              layout={layout}
              busy={busyId === layout.id}
              onEdit={() => router.push(`/resume-layouts/${layout.id}`)}
              onSetDefault={() => void setDefault(layout.id)}
              onDelete={() => void remove(layout.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
