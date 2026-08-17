"use client";

import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Form, FormSaveButton } from "@/components/form";
import { saveSiteConfig } from "@/lib/actions";
import { useToast } from "@/components/toast/toast-provider";
import { runServerAction } from "@/lib/run-server-action";
import type {
  SiteConfig,
  SiteConfigFormData,
  SocialLink,
} from "@portfolio/shared/schemas";

type SocialLinkDraft = SocialLink & { _clientId: string };

type SiteConfigFormValues = Omit<SiteConfigFormData, "social_links"> & {
  social_links: SocialLinkDraft[];
};

function withClientIds(links: SocialLink[]): SocialLinkDraft[] {
  return links.map((link) => ({ ...link, _clientId: crypto.randomUUID() }));
}

function newEmptySocialLink(): SocialLinkDraft {
  return {
    _clientId: crypto.randomUUID(),
    platform: "",
    url: "https://example.com",
    label: "",
  };
}

type SiteConfigFormProps = {
  initialData: SiteConfig | null;
};

export function SiteConfigForm({ initialData }: SiteConfigFormProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const socialLinks = (initialData?.social_links ?? []) as SocialLink[];

  const form = useForm<SiteConfigFormValues>({
    defaultValues: {
      name: initialData?.name ?? "",
      email: initialData?.email ?? "",
      location: initialData?.location ?? "",
      title: initialData?.title ?? "",
      description: initialData?.description ?? "",
      social_links: withClientIds(socialLinks),
      tech_stack: initialData?.tech_stack ?? [],
    },
  });

  const { register, handleSubmit, reset, setValue, control } = form;
  const techStack = useWatch({ control, name: "tech_stack" }) ?? [];
  const { fields, append, remove } = useFieldArray({
    control,
    name: "social_links",
    keyName: "fieldKey",
  });

  async function onSubmit(data: SiteConfigFormValues) {
    setSaving(true);
    const payload: SiteConfigFormData = {
      ...data,
      social_links: data.social_links.map(({ _clientId: _c, ...rest }) => rest),
    };
    const result = await runServerAction(
      () => saveSiteConfig(payload, initialData?.revision),
      toast,
    );
    setSaving(false);
    if (result.success) reset(data);
  }

  return (
    <Form {...form} isSubmitting={saving}>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["name", "Full Name"],
              ["email", "Email"],
              ["location", "Location"],
              ["title", "Job Title"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="mb-1.5 block text-sm font-medium">{label}</label>
              <input
                {...register(key)}
                className={cn(
                  "border-border bg-muted/30 w-full rounded-lg border px-4 py-2.5",
                  "focus:border-accent text-sm focus:outline-hidden",
                )}
              />
            </div>
          ))}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">SEO Description</label>
          <textarea
            {...register("description")}
            rows={3}
            className={cn(
              "border-border bg-muted/30 w-full rounded-lg border px-4 py-2.5",
              "focus:border-accent text-sm focus:outline-hidden",
            )}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Tech Stack (one per line)
          </label>
          <p className="text-muted-foreground mb-1.5 text-xs">
            Shown in the “How this was built” section on the home page.
          </p>
          <textarea
            value={techStack.join("\n")}
            onChange={(e) =>
              setValue(
                "tech_stack",
                e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
                { shouldDirty: true },
              )
            }
            rows={5}
            className={cn(
              "border-border bg-muted/30 w-full rounded-lg border px-4 py-2.5",
              "focus:border-accent text-sm focus:outline-hidden",
            )}
          />
        </div>

        <div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-accent text-sm font-semibold tracking-wider uppercase">
              Social Links
            </h3>
            <button
              type="button"
              onClick={() => append(newEmptySocialLink())}
              className={cn(
                "border-border bg-muted/30 flex items-center justify-center gap-2 rounded-lg border px-3 py-1.5",
                "text-foreground hover:bg-muted/50 text-sm font-medium transition-colors",
              )}
            >
              <Plus className="h-4 w-4" />
              Add link
            </button>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Use platform keys like <code className="bg-muted rounded px-1">github</code>,{" "}
            <code className="bg-muted rounded px-1">linkedin</code>, or{" "}
            <code className="bg-muted rounded px-1">phone</code>.
          </p>

          <div className="mt-3 space-y-3">
            {fields.length === 0 ? (
              <p className="border-border/80 bg-muted/10 text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
                No social links yet. Click &quot;Add link&quot; to add one.
              </p>
            ) : (
              fields.map((field, index) => (
                <div
                  key={field.fieldKey}
                  className="border-border/50 bg-muted/20 flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-end"
                >
                  <input type="hidden" {...register(`social_links.${index}._clientId`)} />
                  <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                    <input
                      {...register(`social_links.${index}.platform`)}
                      placeholder="e.g. github, phone"
                      className="border-border bg-background focus:border-accent w-full rounded-md border px-3 py-2 text-sm focus:outline-hidden"
                    />
                    <input
                      {...register(`social_links.${index}.url`)}
                      placeholder="https://… or tel:+…"
                      className="border-border bg-background focus:border-accent w-full rounded-md border px-3 py-2 text-sm focus:outline-hidden"
                    />
                    <input
                      {...register(`social_links.${index}.label`)}
                      placeholder="Shown in header / PDF"
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
                    aria-label="Remove link"
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
