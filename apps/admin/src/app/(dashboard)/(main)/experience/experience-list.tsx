"use client";

import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { MonthYearPicker } from "@portfolio/ui/date-picker";
import { Select } from "@portfolio/ui/select";
import { Form, FormSaveButton, confirmLeave } from "@/components/form";
import { getDeletedIds, tryLeaveForm } from "@/components/form/list-form-utils";
import { saveExperience, deleteExperience } from "@/lib/actions";
import { useToast } from "@/components/toast/toast-provider";
import { runServerAction } from "@/lib/run-server-action";
import {
  CONTRACT_TYPE_LABELS,
  experienceSchema,
  getContractTypeLabel,
  type ContractType,
  type Experience,
  type ExperienceFormData,
} from "@portfolio/shared/schemas";

type ExperienceListProps = {
  initialData: Experience[];
};

const EMPTY: ExperienceFormData = {
  company: "",
  role: "",
  location: "",
  location_type: "remote",
  contract_type: "full_time",
  start_date: "",
  end_date: null,
  description: "",
  tech_tags: [],
  logo_url: null,
  company_url: null,
  sort_order: 0,
  show_in_resume: true,
};

type ExperienceEditForm = ExperienceFormData & {
  id?: string;
  tech_tags_input: string;
};

type ListFormValues = { items: Experience[] };

function experienceRowToForm(row: Experience): ExperienceEditForm {
  const { id, created_at: _c, updated_at: _u, ...rest } = row;
  const parsed = experienceSchema.parse(rest);
  return { ...parsed, id, tech_tags_input: parsed.tech_tags.join(", ") };
}

function toEditForm(entry: ExperienceFormData & { id?: string }): ExperienceEditForm {
  return { ...entry, tech_tags_input: entry.tech_tags.join(", ") };
}

export function ExperienceList({ initialData }: ExperienceListProps) {
  const [editing, setEditing] = useState<(ExperienceFormData & { id?: string }) | null>(
    null,
  );

  if (editing) {
    return (
      <ExperienceEditPanel
        entry={editing}
        onClose={() => setEditing(null)}
      />
    );
  }

  return (
    <ExperienceListPanel
      initialData={initialData}
      onEdit={setEditing}
    />
  );
}

function ExperienceListPanel({
  initialData,
  onEdit,
}: {
  initialData: Experience[];
  onEdit: (entry: ExperienceFormData & { id?: string }) => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const defaultValues: ListFormValues = { items: initialData };

  const form = useForm<ListFormValues>({ defaultValues });
  const { control, handleSubmit } = form;
  const { fields, remove } = useFieldArray({ control, name: "items", keyName: "fieldKey" });
  const items = useWatch({ control, name: "items", defaultValue: initialData }) ?? initialData;

  function openEdit(entry: ExperienceFormData & { id?: string }) {
    if (!tryLeaveForm(form, defaultValues)) return;
    onEdit(entry);
  }

  async function onSubmit(values: ListFormValues) {
    const deletedIds = getDeletedIds(initialData, values.items);
    if (deletedIds.length === 0) return;

    setSaving(true);
    for (const id of deletedIds) {
      const result = await runServerAction(() => deleteExperience(id), toast);
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
          <Plus className="h-4 w-4" /> Add
        </button>
        <div className="space-y-2">
          {fields.map((field, index) => {
            const exp = items[index];
            if (!exp) return null;
            return (
              <div
                key={field.fieldKey}
                className="border-border/50 bg-muted/20 hover:border-accent/20 flex items-center gap-3 rounded-lg border p-4 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium">{exp.role}</p>
                  <p className="text-muted-foreground text-sm">
                    {exp.company} &middot; {getContractTypeLabel(exp.contract_type)} &middot;{" "}
                    {exp.start_date} – {exp.end_date ?? "Present"}
                  </p>
                  {exp.show_in_resume === false && (
                    <p className="text-muted-foreground mt-1 text-xs">Hidden from resume</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(experienceRowToForm(exp))}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-2"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!confirm("Delete this experience entry?")) return;
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
        <FormSaveButton saving={saving} onClick={handleSubmit(onSubmit)} className="mt-6" />
      </div>
    </Form>
  );
}

function ExperienceEditPanel({
  entry,
  onClose,
}: {
  entry: ExperienceFormData & { id?: string };
  onClose: () => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const defaultValues = toEditForm(entry);

  const form = useForm<ExperienceEditForm>({ defaultValues });
  const { register, handleSubmit, reset, setValue, control } = form;
  const startDate = useWatch({ control, name: "start_date" }) ?? "";
  const endDate = useWatch({ control, name: "end_date" });

  function handleClose() {
    if (form.formState.isDirty && !confirmLeave()) return;
    onClose();
  }

  async function onSubmit(formValues: ExperienceEditForm) {
    setSaving(true);
    const { id, tech_tags_input, ...rest } = formValues;
    const tech_tags = tech_tags_input
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const result = await runServerAction(
      () => saveExperience(id ?? null, { ...rest, tech_tags }),
      toast,
      { onSuccess: () => window.location.reload() },
    );
    setSaving(false);
    if (result.success) reset(formValues);
  }

  return (
    <Form {...form} isSubmitting={saving}>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{entry.id ? "Edit" : "Add"} Experience</h2>
          <button type="button" onClick={handleClose} className="text-muted-foreground hover:text-foreground rounded-md p-1">
            <X className="h-5 w-5" />
          </button>
        </div>
        <input type="hidden" {...register("id")} />
        {(["company", "role", "location"] as const).map((key) => (
          <div key={key}>
            <label className="mb-1 block text-sm font-medium capitalize">{key.replace(/_/g, " ")}</label>
            <input {...register(key)} className="border-border bg-muted/30 focus:border-accent w-full rounded-lg border px-4 py-2 text-sm focus:outline-hidden" />
          </div>
        ))}
        <div>
          <label className="mb-1 block text-sm font-medium">Start date</label>
          <MonthYearPicker
            value={startDate}
            onChange={(v) => setValue("start_date", v ?? "", { shouldDirty: true })}
            placeholder="Select start month"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">End date</label>
          <MonthYearPicker
            value={endDate}
            onChange={(v) => setValue("end_date", v, { shouldDirty: true })}
            placeholder="Present (no end date)"
            clearable
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Location type</label>
          <Select variant="muted" className="w-full px-4" {...register("location_type")}>
            <option value="remote">Remote</option>
            <option value="onsite">On-site</option>
            <option value="hybrid">Hybrid</option>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Job type</label>
          <Select variant="muted" className="w-full px-4" {...register("contract_type")}>
            {(Object.entries(CONTRACT_TYPE_LABELS) as [ContractType, string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Description (one bullet per line)</label>
          <textarea {...register("description")} rows={5} className="border-border bg-muted/30 focus:border-accent w-full rounded-lg border px-4 py-2 text-sm focus:outline-hidden" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Tech tags</label>
          <input {...register("tech_tags_input")} placeholder="React, TypeScript, Node.js" className="border-border bg-muted/30 focus:border-accent w-full rounded-lg border px-4 py-2 text-sm focus:outline-hidden" autoComplete="off" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Sort Order</label>
          <input type="number" {...register("sort_order", { valueAsNumber: true })} className="border-border bg-muted/30 focus:border-accent w-32 rounded-lg border px-4 py-2 text-sm focus:outline-hidden" />
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
