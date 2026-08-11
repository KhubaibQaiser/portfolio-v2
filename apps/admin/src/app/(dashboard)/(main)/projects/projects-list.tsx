"use client";

import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { Plus, Pencil, Trash2, X, Star } from "lucide-react";
import { Select } from "@portfolio/ui/select";
import { cn } from "@/lib/utils";
import { Form, FormSaveButton, confirmLeave } from "@/components/form";
import { getDeletedIds, tryLeaveForm } from "@/components/form/list-form-utils";
import { saveProject, deleteProject } from "@/lib/actions";
import { useToast } from "@/components/toast/toast-provider";
import { runServerAction } from "@/lib/run-server-action";
import {
  projectSchema,
  type Project,
  type ProjectFormData,
} from "@portfolio/shared/schemas";

type ProjectsListProps = {
  initialData: Project[];
};

const EMPTY: ProjectFormData = {
  title: "",
  slug: "",
  description: "",
  summary: "",
  cover_url: null,
  tech_tags: [],
  role: "",
  type: "web",
  github_url: null,
  live_url: null,
  playstore_url: null,
  appstore_url: null,
  is_featured: false,
  sort_order: 0,
  show_in_resume: false,
  resume_status: null,
  resume_description: "",
};

type ProjectEditForm = ProjectFormData & { id?: string };
type ListFormValues = { items: Project[] };

function projectRowToForm(row: Project): ProjectEditForm {
  const { id, created_at: _c, updated_at: _u, ...rest } = row;
  return { ...projectSchema.parse(rest), id };
}

export function ProjectsList({ initialData }: ProjectsListProps) {
  const [editing, setEditing] = useState<(ProjectFormData & { id?: string }) | null>(
    null,
  );

  if (editing) {
    return <ProjectEditPanel entry={editing} onClose={() => setEditing(null)} />;
  }

  return <ProjectsListPanel initialData={initialData} onEdit={setEditing} />;
}

function ProjectsListPanel({
  initialData,
  onEdit,
}: {
  initialData: Project[];
  onEdit: (entry: ProjectFormData & { id?: string }) => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const defaultValues: ListFormValues = { items: initialData };

  const form = useForm<ListFormValues>({ defaultValues });
  const { control, handleSubmit } = form;
  const { fields, remove } = useFieldArray({
    control,
    name: "items",
    keyName: "fieldKey",
  });
  const items =
    useWatch({ control, name: "items", defaultValue: initialData }) ?? initialData;

  function openEdit(entry: ProjectFormData & { id?: string }) {
    if (!tryLeaveForm(form, defaultValues)) return;
    onEdit(entry);
  }

  async function onSubmit(values: ListFormValues) {
    const deletedIds = getDeletedIds(initialData, values.items);
    if (deletedIds.length === 0) return;

    setSaving(true);
    for (const id of deletedIds) {
      const result = await runServerAction(() => deleteProject(id), toast);
      if (!result.success) {
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    window.location.reload();
  }

  return (
    <Form {...form} isSubmitting={saving}>
      <div className="mt-6">
        <button
          type="button"
          onClick={() => openEdit({ ...EMPTY, sort_order: items.length })}
          className="bg-accent text-accent-foreground mb-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Add Project
        </button>
        <div className="space-y-2">
          {fields.map((field, index) => {
            const project = items[index];
            if (!project) return null;
            return (
              <div
                key={field.fieldKey}
                className="border-border/50 bg-muted/20 hover:border-accent/20 flex items-center gap-3 rounded-lg border p-4 transition-colors"
              >
                <Star
                  className={cn(
                    "h-4 w-4",
                    project.is_featured
                      ? "fill-amber-500 text-amber-500"
                      : "text-muted-foreground/30",
                  )}
                />
                <div className="flex-1">
                  <p className="font-medium">{project.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                      {project.type}
                    </span>
                    {project.show_in_resume === false && (
                      <span className="text-muted-foreground text-xs">
                        Hidden from resume
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(projectRowToForm(project))}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-2"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!confirm("Delete this project?")) return;
                    remove(index);
                  }}
                  className="text-muted-foreground rounded-md p-2 hover:bg-red-500/10 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
        <FormSaveButton
          saving={saving}
          onClick={handleSubmit(onSubmit)}
          className="mt-6"
        />
      </div>
    </Form>
  );
}

function ProjectEditPanel({
  entry,
  onClose,
}: {
  entry: ProjectFormData & { id?: string };
  onClose: () => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const form = useForm<ProjectEditForm>({ defaultValues: entry });
  const { register, handleSubmit, reset, setValue, control } = form;
  const techTags = useWatch({ control, name: "tech_tags" }) ?? [];

  function handleClose() {
    if (form.formState.isDirty && !confirmLeave()) return;
    onClose();
  }

  async function onSubmit(formValues: ProjectEditForm) {
    setSaving(true);
    const { id, ...rest } = formValues;
    const payload = {
      ...rest,
      resume_status: rest.resume_status?.trim() ? rest.resume_status.trim() : null,
    };
    const result = await runServerAction(() => saveProject(id ?? null, payload), toast, {
      onSuccess: () => window.location.reload(),
    });
    setSaving(false);
    if (result.success) reset(formValues);
  }

  return (
    <Form {...form} isSubmitting={saving}>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{entry.id ? "Edit" : "Add"} Project</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground rounded-md p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <input type="hidden" {...register("id")} />
        {(["title", "slug", "summary", "role"] as const).map((key) => (
          <div key={key}>
            <label className="mb-1 block text-sm font-medium capitalize">{key}</label>
            <input
              {...register(key)}
              className="border-border bg-muted/30 focus:border-accent w-full rounded-lg border px-4 py-2 text-sm focus:outline-hidden"
            />
          </div>
        ))}
        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            {...register("description")}
            rows={4}
            className="border-border bg-muted/30 focus:border-accent w-full rounded-lg border px-4 py-2 text-sm focus:outline-hidden"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Resume status (optional)
          </label>
          <input
            {...register("resume_status")}
            placeholder="e.g. In Progress"
            className="border-border bg-muted/30 focus:border-accent w-full rounded-lg border px-4 py-2 text-sm focus:outline-hidden"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Resume bullets (one per line)
          </label>
          <textarea
            {...register("resume_description")}
            rows={4}
            placeholder={"Bullet for the PDF resume\nAnother bullet"}
            className="border-border bg-muted/30 focus:border-accent w-full rounded-lg border px-4 py-2 text-sm focus:outline-hidden"
          />
          <p className="text-muted-foreground mt-1 text-xs">
            Used on the resume PDF only. Portfolio description above stays unchanged.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Type</label>
          <Select variant="muted" className="px-4" {...register("type")}>
            {["web", "mobile", "game", "open-source", "other"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Tech Tags (comma-separated)
          </label>
          <input
            value={techTags.join(", ")}
            onChange={(e) =>
              setValue(
                "tech_tags",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
                { shouldDirty: true },
              )
            }
            className="border-border bg-muted/30 focus:border-accent w-full rounded-lg border px-4 py-2 text-sm focus:outline-hidden"
          />
        </div>
        {(["github_url", "live_url", "cover_url"] as const).map((key) => (
          <div key={key}>
            <label className="mb-1 block text-sm font-medium capitalize">
              {key.replace(/_/g, " ")}
            </label>
            <input
              {...register(key)}
              className="border-border bg-muted/30 focus:border-accent w-full rounded-lg border px-4 py-2 text-sm focus:outline-hidden"
            />
          </div>
        ))}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" {...register("is_featured")} />
            Featured
          </label>
          <input
            type="number"
            {...register("sort_order", { valueAsNumber: true })}
            className="border-border bg-muted/30 w-20 rounded border px-2 py-1 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" {...register("show_in_resume")} />
          Show in Resume
        </label>
        <FormSaveButton saving={saving} onClick={handleSubmit(onSubmit)} />
      </form>
    </Form>
  );
}
