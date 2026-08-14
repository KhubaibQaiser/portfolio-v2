"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import type {
  ResumeLayout,
  ResumeLayoutFormData,
  VariantGuidelines,
} from "@portfolio/shared/schemas";
import { Form, FormSaveButton } from "@/components/form";
import { LabeledField } from "@/components/form/labeled-field";
import { saveResumeLayout } from "@/lib/actions";
import { useToast } from "@/components/toast/toast-provider";
import { runServerAction } from "@/lib/run-server-action";
import { cn } from "@/lib/utils";

type Props = {
  layout: ResumeLayout;
};

type FormValues = ResumeLayoutFormData;

const SECTION_KEYS: Array<keyof VariantGuidelines["sections"]> = [
  "personalInfo",
  "summary",
  "experience",
  "education",
  "skills",
  "languages",
  "remoteWorkExperience",
  "references",
  "projects",
  "certifications",
];

export function LayoutForm({ layout }: Props) {
  const toast = useToast();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const form = useForm<FormValues>({
    defaultValues: {
      name: layout.name,
      description: layout.description,
      version: layout.version,
      component_key: layout.component_key,
      preview_image_url: layout.preview_image_url,
      is_default: layout.is_default,
      notes: layout.notes,
      guidelines: layout.guidelines,
    },
  });

  const { register, handleSubmit, control, setValue } = form;
  const sections = useWatch({ control, name: "guidelines.sections" });
  const emphasis = useWatch({ control, name: "guidelines.contentEmphasis" });

  async function onSubmit(data: FormValues) {
    setSaving(true);
    const result = await runServerAction(() => saveResumeLayout(layout.id, data), toast);
    setSaving(false);
    if (result.success) router.refresh();
  }

  if (!sections || !emphasis) return null;

  return (
    <Form {...form} isSubmitting={saving}>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-8">
        <div className="grid gap-3 sm:grid-cols-2">
          <LabeledField label="Name">
            <input {...register("name")} className={inputCls} />
          </LabeledField>
          <LabeledField label="Visual template">
            <select {...register("component_key")} className={inputCls}>
              <option value="classic">Classic (single column)</option>
              <option value="modern-blue">Modern Blue (two column)</option>
            </select>
          </LabeledField>
          <LabeledField label="Description" className="sm:col-span-2">
            <input {...register("description")} className={inputCls} />
          </LabeledField>
          <LabeledField label="Preview image URL">
            <input
              {...register("preview_image_url")}
              placeholder="https://…"
              className={inputCls}
            />
          </LabeledField>
          <LabeledField label="Version">
            <input
              type="number"
              min={1}
              {...register("version", { valueAsNumber: true })}
              className={inputCls}
            />
          </LabeledField>
          <LabeledField label="Notes" className="sm:col-span-2">
            <textarea {...register("notes")} rows={3} className={inputCls} />
          </LabeledField>
        </div>

        <section>
          <h2 className="text-accent mb-3 text-sm font-semibold tracking-wider uppercase">
            Sections
          </h2>
          <div className="flex flex-wrap gap-3">
            {SECTION_KEYS.map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sections[key]}
                  onChange={(e) =>
                    setValue(`guidelines.sections.${key}`, e.target.checked, {
                      shouldDirty: true,
                    })
                  }
                />
                {key}
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-accent text-sm font-semibold tracking-wider uppercase">
            Summary &amp; bullets
          </h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={emphasis.summaryStrategy.regenerateForJob}
              onChange={(e) =>
                setValue(
                  "guidelines.contentEmphasis.summaryStrategy.regenerateForJob",
                  e.target.checked,
                  { shouldDirty: true },
                )
              }
            />
            Always regenerate summary for the job description
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={emphasis.experienceStrategy.reorderByRelevance}
              onChange={(e) =>
                setValue(
                  "guidelines.contentEmphasis.experienceStrategy.reorderByRelevance",
                  e.target.checked,
                  { shouldDirty: true },
                )
              }
            />
            Reorder roles by JD relevance
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={emphasis.experienceStrategy.highlightKeywords}
              onChange={(e) =>
                setValue(
                  "guidelines.contentEmphasis.experienceStrategy.highlightKeywords",
                  e.target.checked,
                  { shouldDirty: true },
                )
              }
            />
            Bold JD keywords in bullets
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={emphasis.experienceStrategy.filterOutIrrelevant}
              onChange={(e) =>
                setValue(
                  "guidelines.contentEmphasis.experienceStrategy.filterOutIrrelevant",
                  e.target.checked,
                  { shouldDirty: true },
                )
              }
            />
            Drop unrelated roles and bullets
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={emphasis.skillsStrategy.matchJobDescription}
              onChange={(e) =>
                setValue(
                  "guidelines.contentEmphasis.skillsStrategy.matchJobDescription",
                  e.target.checked,
                  { shouldDirty: true },
                )
              }
            />
            Reorder skills to match the job description
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={emphasis.skillsStrategy.highlightRequired}
              onChange={(e) =>
                setValue(
                  "guidelines.contentEmphasis.skillsStrategy.highlightRequired",
                  e.target.checked,
                  { shouldDirty: true },
                )
              }
            />
            Highlight required vs nice-to-have skills
          </label>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <LabeledField label="Max summary lines">
              <input
                type="number"
                min={1}
                max={8}
                {...register(
                  "guidelines.contentEmphasis.summaryStrategy.maxSummaryLines",
                  {
                    valueAsNumber: true,
                  },
                )}
                className={inputCls}
              />
            </LabeledField>
            <LabeledField label="Max bullet lines">
              <input
                type="number"
                min={1}
                max={6}
                {...register(
                  "guidelines.contentEmphasis.experienceStrategy.maxBulletLines",
                  { valueAsNumber: true },
                )}
                className={inputCls}
              />
            </LabeledField>
            <LabeledField label="Max bullets per role">
              <input
                type="number"
                min={1}
                max={10}
                {...register("guidelines.validation.maxBulletsPerRole", {
                  valueAsNumber: true,
                })}
                className={inputCls}
              />
            </LabeledField>
            <LabeledField label="Max experience items">
              <input
                type="number"
                min={1}
                max={20}
                {...register("guidelines.validation.maxExperienceItems", {
                  valueAsNumber: true,
                })}
                className={inputCls}
              />
            </LabeledField>
          </div>
        </section>

        <section>
          <h2 className="text-accent mb-2 text-sm font-semibold tracking-wider uppercase">
            AI prompt template
          </h2>
          <p className="text-muted-foreground mb-2 text-xs">
            Use {"{jobDescription}"} and {"{resumeData}"}. Guardrails are always appended
            in code.
          </p>
          <textarea
            {...register("guidelines.aiTailoringPromptTemplate")}
            rows={16}
            className={cn(inputCls, "font-mono text-xs")}
          />
        </section>

        <FormSaveButton saving={saving} onClick={handleSubmit(onSubmit)} />
      </form>
    </Form>
  );
}

const inputCls = cn(
  "border-border bg-muted/30 w-full rounded-lg border px-3 py-2 text-sm",
  "focus:border-accent focus:outline-hidden",
);
