"use client";

import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { Form, FormSaveButton, confirmLeave } from "@/components/form";
import { getDeletedIds, tryLeaveForm } from "@/components/form/list-form-utils";
import { saveTestimonial, deleteTestimonialAction } from "@/lib/actions";
import { useToast } from "@/components/toast/toast-provider";
import { runServerAction } from "@/lib/run-server-action";
import {
  DEFAULT_LINKEDIN_RECOMMENDATIONS_URL,
  type Testimonial,
} from "@portfolio/shared/schemas";

type RecommendationsListProps = {
  initialData: Testimonial[];
};

const EMPTY: Omit<Testimonial, "id" | "created_at" | "updated_at"> = {
  full_name: "",
  profile_url: "",
  role_title: "",
  recommended_at: "",
  description: "",
  linkedin_url: DEFAULT_LINKEDIN_RECOMMENDATIONS_URL,
  avatar_url: null,
};

type RecommendationEditForm = typeof EMPTY & { id?: string };
type ListFormValues = { items: Testimonial[] };

const FORM_FIELDS = [
  { key: "full_name" as const, label: "Full name", placeholder: undefined },
  { key: "profile_url" as const, label: "Profile URL", placeholder: undefined },
  { key: "role_title" as const, label: "Role / title", placeholder: undefined },
  { key: "recommended_at" as const, label: "Date (DD-MM-YYYY)", placeholder: "15-03-2024" },
  { key: "linkedin_url" as const, label: "LinkedIn verify URL", placeholder: undefined },
  { key: "avatar_url" as const, label: "Avatar URL (optional)", placeholder: undefined },
];

export function RecommendationsList({ initialData }: RecommendationsListProps) {
  const [editing, setEditing] = useState<RecommendationEditForm | null>(null);

  if (editing) {
    return <RecommendationEditPanel entry={editing} onClose={() => setEditing(null)} />;
  }

  return <RecommendationsListPanel initialData={initialData} onEdit={setEditing} />;
}

function RecommendationsListPanel({
  initialData,
  onEdit,
}: {
  initialData: Testimonial[];
  onEdit: (entry: RecommendationEditForm) => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const defaultValues: ListFormValues = { items: initialData };

  const form = useForm<ListFormValues>({ defaultValues });
  const { control, handleSubmit } = form;
  const { fields, remove } = useFieldArray({ control, name: "items", keyName: "fieldKey" });
  const items = useWatch({ control, name: "items", defaultValue: initialData }) ?? initialData;

  function openEdit(entry: RecommendationEditForm) {
    if (!tryLeaveForm(form, defaultValues)) return;
    onEdit(entry);
  }

  async function onSubmit(values: ListFormValues) {
    const deletedIds = getDeletedIds(initialData, values.items);
    if (deletedIds.length === 0) return;

    setSaving(true);
    for (const id of deletedIds) {
      const result = await runServerAction(() => deleteTestimonialAction(id), toast);
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
          onClick={() => openEdit({ ...EMPTY })}
          className="bg-accent text-accent-foreground mb-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Add Recommendation
        </button>
        <div className="space-y-2">
          {fields.map((field, index) => {
            const item = items[index];
            if (!item) return null;
            return (
              <div
                key={field.fieldKey}
                className="border-border/50 bg-muted/20 hover:border-accent/20 flex items-center gap-3 rounded-lg border p-4 transition-colors"
              >
                <div className="flex-1">
                  <p className="text-muted-foreground text-sm italic">
                    &ldquo;{item.description.slice(0, 80)}
                    {item.description.length > 80 ? "..." : ""}&rdquo;
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {item.full_name}
                    {item.recommended_at ? ` · ${item.recommended_at}` : null}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(item)}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-2"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!confirm("Delete this recommendation?")) return;
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

function RecommendationEditPanel({
  entry,
  onClose,
}: {
  entry: RecommendationEditForm;
  onClose: () => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const form = useForm<RecommendationEditForm>({ defaultValues: entry });
  const { register, handleSubmit, reset } = form;

  function handleClose() {
    if (form.formState.isDirty && !confirmLeave()) return;
    onClose();
  }

  async function onSubmit(formValues: RecommendationEditForm) {
    setSaving(true);
    const { id, ...rest } = formValues;
    const payload = {
      ...rest,
      avatar_url: rest.avatar_url?.trim() ? rest.avatar_url.trim() : null,
    };
    const result = await runServerAction(
      () => saveTestimonial(id ?? null, payload),
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
          <h2 className="text-lg font-semibold">{entry.id ? "Edit" : "Add"} Recommendation</h2>
          <button type="button" onClick={handleClose} className="text-muted-foreground hover:text-foreground rounded-md p-1">
            <X className="h-5 w-5" />
          </button>
        </div>
        <input type="hidden" {...register("id")} />
        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea {...register("description")} rows={6} className="border-border bg-muted/30 focus:border-accent w-full rounded-lg border px-4 py-2 text-sm focus:outline-hidden" />
        </div>
        {FORM_FIELDS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="mb-1 block text-sm font-medium">{label}</label>
            <input {...register(key)} placeholder={placeholder} className="border-border bg-muted/30 focus:border-accent w-full rounded-lg border px-4 py-2 text-sm focus:outline-hidden" />
          </div>
        ))}
        <FormSaveButton saving={saving} onClick={handleSubmit(onSubmit)} />
      </form>
    </Form>
  );
}
