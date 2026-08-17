"use client";

import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Select } from "@portfolio/ui/select";
import { cn } from "@/lib/utils";
import { Form, FormSaveButton } from "@/components/form";
import { saveAbout } from "@/lib/actions";
import { useToast } from "@/components/toast/toast-provider";
import { runServerAction } from "@/lib/run-server-action";
import type { About, AboutFormData } from "@portfolio/shared/schemas";

type AboutFormProps = {
  initialData: About | null;
  derivedCompaniesCount: number;
};

export function AboutForm({ initialData, derivedCompaniesCount }: AboutFormProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const form = useForm<AboutFormData>({
    defaultValues: {
      bio: initialData?.bio ?? "",
      photo_url: initialData?.photo_url ?? "",
      status: (initialData?.status as AboutFormData["status"] | undefined) ?? "available",
      timezone: initialData?.timezone ?? "GMT+5",
      years_experience: initialData?.years_experience ?? 0,
      countries_count: initialData?.countries_count ?? 0,
      projects_count: initialData?.projects_count ?? 0,
      users_impacted: initialData?.users_impacted ?? "0",
      industries: initialData?.industries ?? [],
      languages: initialData?.languages ?? [],
      highlights: initialData?.highlights ?? [],
    },
  });

  const { register, handleSubmit, reset, setValue, control } = form;
  const industries = useWatch({ control, name: "industries" }) ?? [];
  const languages = useWatch({ control, name: "languages" }) ?? [];
  const { fields, append, remove } = useFieldArray({ control, name: "highlights" });

  async function onSubmit(data: AboutFormData) {
    setSaving(true);
    const result = await runServerAction(
      () => saveAbout(data, initialData?.revision),
      toast,
    );
    setSaving(false);
    if (result.success) reset(data);
  }

  return (
    <Form {...form} isSubmitting={saving}>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Bio</label>
          <textarea
            {...register("bio")}
            rows={6}
            className={cn(
              "border-border bg-muted/30 w-full rounded-lg border px-4 py-2.5",
              "focus:border-accent text-sm focus:outline-hidden",
            )}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Photo URL</label>
          <input
            {...register("photo_url")}
            className={cn(
              "border-border bg-muted/30 w-full rounded-lg border px-4 py-2.5",
              "focus:border-accent text-sm focus:outline-hidden",
            )}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Status</label>
          <Select variant="muted" className="px-4" {...register("status")}>
            <option value="available">Open to Opportunities</option>
            <option value="open">Open to Conversations</option>
            <option value="unavailable">Not Available</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Companies</label>
            <div
              className={cn(
                "border-border bg-muted/20 flex min-h-[42px] items-center rounded-lg border px-4 py-2.5",
                "text-muted-foreground text-sm",
              )}
            >
              {derivedCompaniesCount}{" "}
              <span className="ml-1.5 text-xs">
                (unique employers from Experience — updates when you edit that list)
              </span>
            </div>
          </div>
          {(
            [
              ["years_experience", "Years Experience", "number"],
              ["countries_count", "Countries", "number"],
              ["projects_count", "Projects", "number"],
              ["users_impacted", "Users Impacted", "text"],
              ["timezone", "Timezone", "text"],
            ] as const
          ).map(([key, label, inputType]) => (
            <div key={key}>
              <label className="mb-1.5 block text-sm font-medium">{label}</label>
              <input
                type={inputType}
                {...register(
                  key,
                  inputType === "number" ? { valueAsNumber: true } : undefined,
                )}
                className={cn(
                  "border-border bg-muted/30 w-full rounded-lg border px-4 py-2.5",
                  "focus:border-accent text-sm focus:outline-hidden",
                )}
              />
              {key === "countries_count" && (
                <p className="text-muted-foreground mt-1.5 text-xs">
                  Manual count for how many countries you’ve worked across (there is no
                  per-job country field yet). Used with Companies in the “Companies across
                  N countries” line on the site.
                </p>
              )}
            </div>
          ))}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Industries (comma-separated)
          </label>
          <input
            value={industries.join(", ")}
            onChange={(e) =>
              setValue(
                "industries",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
                { shouldDirty: true },
              )
            }
            className={cn(
              "border-border bg-muted/30 w-full rounded-lg border px-4 py-2.5",
              "focus:border-accent text-sm focus:outline-hidden",
            )}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Languages (comma-separated)
          </label>
          <input
            value={languages.join(", ")}
            onChange={(e) =>
              setValue(
                "languages",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
                { shouldDirty: true },
              )
            }
            className={cn(
              "border-border bg-muted/30 w-full rounded-lg border px-4 py-2.5",
              "focus:border-accent text-sm focus:outline-hidden",
            )}
          />
        </div>

        <div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-accent text-sm font-semibold tracking-wider uppercase">
              Why Hire Me
            </h3>
            <button
              type="button"
              onClick={() => append({ title: "", description: "" })}
              className={cn(
                "border-border bg-muted/30 flex items-center justify-center gap-2 rounded-lg border px-3 py-1.5",
                "text-foreground hover:bg-muted/50 text-sm font-medium transition-colors",
              )}
            >
              <Plus className="h-4 w-4" />
              Add highlight
            </button>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Differentiator cards shown in the “Why Hire Me” section on the home page.
          </p>

          <div className="mt-3 space-y-3">
            {fields.length === 0 ? (
              <p className="border-border/80 bg-muted/10 text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
                No highlights yet. Click &quot;Add highlight&quot; to add one.
              </p>
            ) : (
              fields.map((field, index) => (
                <div
                  key={field.id}
                  className="border-border/50 bg-muted/20 flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-start"
                >
                  <div className="grid flex-1 gap-3">
                    <input
                      {...register(`highlights.${index}.title`)}
                      placeholder="Title (e.g. I Ship End-to-End)"
                      className="border-border bg-background focus:border-accent w-full rounded-md border px-3 py-2 text-sm focus:outline-hidden"
                    />
                    <textarea
                      {...register(`highlights.${index}.description`)}
                      rows={2}
                      placeholder="One or two sentences."
                      className="border-border bg-background focus:border-accent w-full rounded-md border px-3 py-2 text-sm focus:outline-hidden"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className={cn(
                      "border-border flex shrink-0 items-center justify-center rounded-md border p-2",
                      "text-muted-foreground hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive transition-colors",
                    )}
                    aria-label="Remove highlight"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <FormSaveButton saving={saving} onClick={handleSubmit(onSubmit)} />
      </form>
    </Form>
  );
}
