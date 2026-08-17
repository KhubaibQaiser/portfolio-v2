"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Form, FormSaveButton } from "@/components/form";
import { saveHero } from "@/lib/actions";
import { useToast } from "@/components/toast/toast-provider";
import { runServerAction } from "@/lib/run-server-action";
import type { Hero, HeroFormData } from "@portfolio/shared/schemas";

type HeroFormProps = {
  initialData: Hero | null;
};

export function HeroForm({ initialData }: HeroFormProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const form = useForm<HeroFormData>({
    defaultValues: {
      greeting: initialData?.greeting ?? "Hi, my name is",
      headline: initialData?.headline ?? "",
      subtitle: initialData?.subtitle ?? [],
      value_proposition: initialData?.value_proposition ?? "",
      cta_primary_text: initialData?.cta_primary_text ?? "View My Work",
      cta_secondary_text: initialData?.cta_secondary_text ?? "Download Resume",
    },
  });

  const { register, handleSubmit, reset, setValue, control } = form;
  const values = useWatch({ control }) ?? form.formState.defaultValues;

  async function onSubmit(data: HeroFormData) {
    setSaving(true);
    const result = await runServerAction(
      () => saveHero(data, initialData?.revision),
      toast,
    );
    setSaving(false);
    if (result.success) reset(data);
  }

  return (
    <Form {...form} isSubmitting={saving}>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        {(
          [
            "greeting",
            "headline",
            "value_proposition",
            "cta_primary_text",
            "cta_secondary_text",
          ] as const
        ).map((key) => (
          <div key={key}>
            <label className="mb-1.5 block text-sm font-medium capitalize">
              {key.replace(/_/g, " ")}
            </label>
            {String(values?.[key] ?? "").length > 80 ? (
              <textarea
                {...register(key)}
                rows={3}
                className={cn(
                  "border-border bg-muted/30 w-full rounded-lg border px-4 py-2.5",
                  "focus:border-accent text-sm focus:outline-hidden",
                )}
              />
            ) : (
              <input
                {...register(key)}
                className={cn(
                  "border-border bg-muted/30 w-full rounded-lg border px-4 py-2.5",
                  "focus:border-accent text-sm focus:outline-hidden",
                )}
              />
            )}
          </div>
        ))}

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Subtitles (one per line)
          </label>
          <textarea
            value={(values?.subtitle ?? []).join("\n")}
            onChange={(e) =>
              setValue(
                "subtitle",
                e.target.value.split("\n").filter((line) => line.trim()),
                { shouldDirty: true },
              )
            }
            rows={3}
            className={cn(
              "border-border bg-muted/30 w-full rounded-lg border px-4 py-2.5",
              "focus:border-accent text-sm focus:outline-hidden",
            )}
          />
        </div>

        <FormSaveButton saving={saving} onClick={handleSubmit(onSubmit)} />
      </form>
    </Form>
  );
}
