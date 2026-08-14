"use client";

import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Form, FormSaveButton } from "@/components/form";
import { saveResume } from "@/lib/actions";
import { useToast } from "@/components/toast/toast-provider";
import { runServerAction } from "@/lib/run-server-action";
import type {
  Resume as ResumeRow,
  Education,
  Certification,
  ResumeFormData,
  ResumeLanguage,
  LanguageProficiency,
} from "@portfolio/shared/schemas";

const SECTION_OPTIONS = [
  { key: "experience", label: "Work experience" },
  { key: "projects", label: "Projects" },
  { key: "education", label: "Education" },
  { key: "certifications", label: "Certifications" },
  { key: "skills", label: "Technical skills" },
  { key: "languages", label: "Languages" },
  { key: "remote", label: "Remote work" },
  { key: "references", label: "References" },
] as const;

const LANGUAGE_LEVELS: LanguageProficiency[] = ["Native", "Fluent", "Intermediate"];

type LanguageDraft = ResumeLanguage & { _clientId: string };
type EducationDraft = Education & { _clientId: string };
type CertificationDraft = Certification & { _clientId: string };

type ResumeFormValues = Omit<
  ResumeFormData,
  "education" | "certifications" | "languages"
> & {
  education: EducationDraft[];
  certifications: CertificationDraft[];
  languages: LanguageDraft[];
};

function clientId(): string {
  return crypto.randomUUID();
}

function parseEducation(raw: unknown): EducationDraft[] {
  const list = (raw as Education[] | null) ?? [];
  if (list.length === 0) {
    return [{ _clientId: clientId(), degree: "", institution: "", year: "", url: null }];
  }
  return list.map((entry) => ({
    ...entry,
    url: entry.url ?? null,
    _clientId: clientId(),
  }));
}

function parseCertifications(raw: unknown): CertificationDraft[] {
  const list = (raw as Certification[] | null) ?? [];
  return list.map((entry) => ({
    ...entry,
    url: entry.url ?? null,
    _clientId: clientId(),
  }));
}

function parseLanguages(raw: unknown): LanguageDraft[] {
  const list = (raw as ResumeLanguage[] | null) ?? [];
  return list.map((entry) => ({ ...entry, _clientId: clientId() }));
}

function parseVisibleSections(raw: unknown): string[] {
  const value = raw as string[] | null;
  if (Array.isArray(value) && value.length > 0) return [...value];
  return SECTION_OPTIONS.map((section) => section.key);
}

type ResumeFormProps = {
  initialData: ResumeRow | null;
};

export function ResumeForm({ initialData }: ResumeFormProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const form = useForm<ResumeFormValues>({
    defaultValues: {
      default_summary: initialData?.default_summary ?? "",
      voice_sample: initialData?.voice_sample ?? "",
      education: parseEducation(initialData?.education),
      certifications: parseCertifications(initialData?.certifications),
      languages: parseLanguages(initialData?.languages),
      remote_work_line: initialData?.remote_work_line ?? "",
      references_line: initialData?.references_line ?? "References available on request",
      visible_sections: parseVisibleSections(initialData?.visible_sections),
      is_projects_visible: initialData?.is_projects_visible ?? true,
    },
  });

  const { register, handleSubmit, reset, setValue, control } = form;
  const visibleSections = useWatch({ control, name: "visible_sections" }) ?? [];
  const voiceSample = useWatch({ control, name: "voice_sample" }) ?? "";
  const educationFields = useFieldArray({
    control,
    name: "education",
    keyName: "fieldKey",
  });
  const certFields = useFieldArray({
    control,
    name: "certifications",
    keyName: "fieldKey",
  });
  const languageFields = useFieldArray({
    control,
    name: "languages",
    keyName: "fieldKey",
  });

  function toggleSection(key: string) {
    const next = visibleSections.includes(key)
      ? visibleSections.filter((section) => section !== key)
      : [...visibleSections, key];
    setValue("visible_sections", next, { shouldDirty: true });
  }

  async function onSubmit(data: ResumeFormValues) {
    setSaving(true);
    const payload: ResumeFormData = {
      default_summary: data.default_summary,
      education: data.education.map(({ _clientId: _a, ...rest }) => rest),
      certifications: data.certifications.map(({ _clientId: _b, ...rest }) => rest),
      languages: data.languages
        .map(({ _clientId: _c, ...rest }) => rest)
        .filter((lang) => lang.name.trim().length > 0),
      remote_work_line:
        (data.remote_work_line ?? "").trim() === ""
          ? null
          : (data.remote_work_line ?? null),
      references_line:
        (data.references_line ?? "").trim() === ""
          ? null
          : (data.references_line ?? null),
      visible_sections: data.visible_sections,
      is_projects_visible: data.is_projects_visible,
      voice_sample:
        (data.voice_sample ?? "").trim() === "" ? null : (data.voice_sample ?? null),
    };
    const result = await runServerAction(() => saveResume(payload), toast);
    setSaving(false);
    if (result.success) reset(data);
  }

  return (
    <Form {...form} isSubmitting={saving}>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-8">
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Professional summary (PDF &amp; site)
          </label>
          <textarea
            {...register("default_summary")}
            rows={8}
            className={cn(
              "border-border bg-muted/30 w-full rounded-lg border px-4 py-2.5",
              "focus:border-accent text-sm focus:outline-hidden",
            )}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Voice sample (Resume AI only)
          </label>
          <p className="text-muted-foreground mb-2 text-xs">
            ~150–300 words in your own voice. The generator uses this as a few-shot
            anchor.
          </p>
          <textarea
            {...register("voice_sample")}
            rows={8}
            maxLength={3000}
            className={cn(
              "border-border bg-muted/30 w-full rounded-lg border px-4 py-2.5",
              "focus:border-accent text-sm focus:outline-hidden",
            )}
          />
          <p className="text-muted-foreground mt-1 text-xs">
            {(voiceSample ?? "").length}/3000
          </p>
        </div>

        <div>
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-accent text-sm font-semibold tracking-wider uppercase">
              Education
            </h2>
            <button
              type="button"
              onClick={() =>
                educationFields.append({
                  _clientId: clientId(),
                  degree: "",
                  institution: "",
                  year: "",
                  url: null,
                })
              }
              className="border-border bg-muted/30 hover:bg-muted/50 flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Add entry
            </button>
          </div>
          <div className="space-y-4">
            {educationFields.fields.map((row, index) => (
              <div
                key={row.fieldKey}
                className="border-border/50 bg-muted/20 rounded-lg border p-4"
              >
                <input type="hidden" {...register(`education.${index}._clientId`)} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    {...register(`education.${index}.degree`)}
                    placeholder="Degree"
                    className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
                  />
                  <input
                    {...register(`education.${index}.year`)}
                    placeholder="Year"
                    className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
                  />
                  <input
                    {...register(`education.${index}.institution`)}
                    placeholder="Institution"
                    className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm sm:col-span-2"
                  />
                  <input
                    {...register(`education.${index}.url`)}
                    placeholder="URL (optional)"
                    className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm sm:col-span-2"
                  />
                </div>
                {educationFields.fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => educationFields.remove(index)}
                    className="text-muted-foreground hover:text-destructive mt-3 flex items-center gap-1 text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-accent text-sm font-semibold tracking-wider uppercase">
              Certifications
            </h2>
            <button
              type="button"
              onClick={() =>
                certFields.append({
                  _clientId: clientId(),
                  name: "",
                  issuer: "",
                  url: null,
                })
              }
              className="border-border bg-muted/30 hover:bg-muted/50 flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Add certification
            </button>
          </div>
          <div className="space-y-4">
            {certFields.fields.length === 0 ? (
              <p className="text-muted-foreground text-sm">No certifications yet.</p>
            ) : (
              certFields.fields.map((row, index) => (
                <div
                  key={row.fieldKey}
                  className="border-border/50 bg-muted/20 rounded-lg border p-4"
                >
                  <input
                    type="hidden"
                    {...register(`certifications.${index}._clientId`)}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      {...register(`certifications.${index}.name`)}
                      placeholder="Name"
                      className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm sm:col-span-2"
                    />
                    <input
                      {...register(`certifications.${index}.issuer`)}
                      placeholder="Issuer"
                      className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
                    />
                    <input
                      {...register(`certifications.${index}.url`)}
                      placeholder="URL (optional)"
                      className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => certFields.remove(index)}
                    className="text-muted-foreground hover:text-destructive mt-3 flex items-center gap-1 text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-accent text-sm font-semibold tracking-wider uppercase">
              Languages
            </h2>
            <button
              type="button"
              onClick={() =>
                languageFields.append({
                  _clientId: clientId(),
                  name: "",
                  level: "Intermediate",
                })
              }
              className="border-border bg-muted/30 hover:bg-muted/50 flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Add language
            </button>
          </div>
          <div className="space-y-3">
            {languageFields.fields.length === 0 ? (
              <p className="text-muted-foreground text-sm">No languages yet.</p>
            ) : (
              languageFields.fields.map((row, index) => (
                <div
                  key={row.fieldKey}
                  className="border-border/50 bg-muted/20 flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center"
                >
                  <input type="hidden" {...register(`languages.${index}._clientId`)} />
                  <input
                    {...register(`languages.${index}.name`)}
                    placeholder="Language"
                    className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
                  />
                  <select
                    {...register(`languages.${index}.level`)}
                    className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm sm:w-44"
                  >
                    {LANGUAGE_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => languageFields.remove(index)}
                    className="text-muted-foreground hover:text-destructive flex items-center gap-1 text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Remote work line</label>
          <input
            {...register("remote_work_line")}
            placeholder="Remote-first since 2015. Overlapped US, EU, and APAC time zones."
            className="border-border bg-muted/30 w-full rounded-lg border px-4 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">References line</label>
          <input
            {...register("references_line")}
            placeholder="References available on request"
            className="border-border bg-muted/30 w-full rounded-lg border px-4 py-2.5 text-sm"
          />
        </div>

        <div>
          <h2 className="text-accent mb-3 text-sm font-semibold tracking-wider uppercase">
            Visible resume sections
          </h2>
          <div className="flex flex-wrap gap-4">
            {SECTION_OPTIONS.map((section) => (
              <label
                key={section.key}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={visibleSections.includes(section.key)}
                  onChange={() => toggleSection(section.key)}
                  className="border-border rounded"
                />
                {section.label}
              </label>
            ))}
          </div>
        </div>

        <FormSaveButton saving={saving} onClick={handleSubmit(onSubmit)} />
      </form>
    </Form>
  );
}
