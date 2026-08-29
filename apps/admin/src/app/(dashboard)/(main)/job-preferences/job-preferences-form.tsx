"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Form, FormSaveButton } from "@/components/form";
import { saveJobPreferences } from "@/lib/job-actions";
import { useToast } from "@/components/toast/toast-provider";
import { runServerAction } from "@/lib/run-server-action";
import { cn } from "@/lib/utils";
import type { JobPreferences, JobPreferencesFormData } from "@portfolio/shared/schemas";

function lines(values: string[]): string {
  return values.join("\n");
}

function parseLines(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

type FormValues = {
  title_families: string;
  seniority_bands: string;
  work_arrangements: JobPreferencesFormData["work_arrangements"];
  location_allow: string;
  location_deny: string;
  salary_floor: string;
  salary_currency: string;
  employment_types: JobPreferencesFormData["employment_types"];
  visa_relocation: JobPreferencesFormData["visa_relocation"];
  keyword_include: string;
  keyword_exclude: string;
  recency_days: number;
  notify_threshold: number;
  digest_threshold: number;
  default_layout_id: string;
};

export function JobPreferencesForm({
  initialData,
  layouts,
}: {
  initialData: JobPreferences;
  layouts: Array<{ id: string; name: string }>;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const form = useForm<FormValues>({
    defaultValues: {
      title_families: lines(initialData.title_families),
      seniority_bands: lines(initialData.seniority_bands),
      work_arrangements: initialData.work_arrangements,
      location_allow: lines(initialData.location_allow),
      location_deny: lines(initialData.location_deny),
      salary_floor:
        initialData.salary_floor === null ? "" : String(initialData.salary_floor),
      salary_currency: initialData.salary_currency,
      employment_types: initialData.employment_types,
      visa_relocation: initialData.visa_relocation,
      keyword_include: lines(initialData.keyword_include),
      keyword_exclude: lines(initialData.keyword_exclude),
      recency_days: initialData.recency_days,
      notify_threshold: initialData.notify_threshold,
      digest_threshold: initialData.digest_threshold,
      default_layout_id: initialData.default_layout_id ?? "",
    },
  });
  const { register, handleSubmit, reset } = form;

  async function onSubmit(data: FormValues) {
    setSaving(true);
    const payload: JobPreferencesFormData = {
      title_families: parseLines(data.title_families),
      seniority_bands: parseLines(data.seniority_bands),
      work_arrangements: data.work_arrangements,
      location_allow: parseLines(data.location_allow),
      location_deny: parseLines(data.location_deny),
      salary_floor:
        data.salary_floor.trim() === "" ? null : Number.parseInt(data.salary_floor, 10),
      salary_currency: data.salary_currency,
      employment_types: data.employment_types,
      visa_relocation: data.visa_relocation,
      keyword_include: parseLines(data.keyword_include),
      keyword_exclude: parseLines(data.keyword_exclude),
      recency_days: Number(data.recency_days),
      notify_threshold: Number(data.notify_threshold),
      digest_threshold: Number(data.digest_threshold),
      recommended_job_id: initialData.recommended_job_id,
      jobspipe_last_search_date: initialData.jobspipe_last_search_date,
      default_layout_id:
        data.default_layout_id.trim() === "" ? null : data.default_layout_id,
    };
    const result = await runServerAction(
      () => saveJobPreferences(payload, initialData.revision),
      toast,
    );
    setSaving(false);
    if (result.success) reset(data);
  }

  const inputClass = cn(
    "border-border bg-muted/30 w-full rounded-lg border px-4 py-2.5",
    "focus:border-accent text-sm focus:outline-hidden",
  );

  return (
    <Form {...form} isSubmitting={saving}>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        <label className="block text-sm font-medium">
          Title families (one per line)
          <textarea
            {...register("title_families")}
            rows={4}
            className={cn(inputClass, "mt-1.5")}
          />
        </label>
        <label className="block text-sm font-medium">
          Seniority bands (one per line)
          <textarea
            {...register("seniority_bands")}
            rows={3}
            className={cn(inputClass, "mt-1.5")}
          />
        </label>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Work arrangements</legend>
          {(["remote", "hybrid", "onsite"] as const).map((value) => (
            <label key={value} className="mr-4 text-sm">
              <input
                type="checkbox"
                value={value}
                {...register("work_arrangements")}
                className="mr-1"
              />
              {value}
            </label>
          ))}
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Location allow
            <textarea
              {...register("location_allow")}
              rows={3}
              className={cn(inputClass, "mt-1.5")}
            />
          </label>
          <label className="block text-sm font-medium">
            Location deny
            <textarea
              {...register("location_deny")}
              rows={3}
              className={cn(inputClass, "mt-1.5")}
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Salary floor
            <input {...register("salary_floor")} className={cn(inputClass, "mt-1.5")} />
          </label>
          <label className="block text-sm font-medium">
            Currency
            <input
              {...register("salary_currency")}
              className={cn(inputClass, "mt-1.5")}
            />
          </label>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Employment types</legend>
          {(["full_time", "contract", "part_time", "internship"] as const).map(
            (value) => (
              <label key={value} className="mr-4 text-sm">
                <input
                  type="checkbox"
                  value={value}
                  {...register("employment_types")}
                  className="mr-1"
                />
                {value.replace("_", "-")}
              </label>
            ),
          )}
        </fieldset>
        <label className="block text-sm font-medium">
          Visa / relocation
          <select {...register("visa_relocation")} className={cn(inputClass, "mt-1.5")}>
            <option value="required">required</option>
            <option value="optional">optional</option>
            <option value="exclude">exclude</option>
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Keyword include
            <textarea
              {...register("keyword_include")}
              rows={3}
              className={cn(inputClass, "mt-1.5")}
            />
          </label>
          <label className="block text-sm font-medium">
            Keyword exclude
            <textarea
              {...register("keyword_exclude")}
              rows={3}
              className={cn(inputClass, "mt-1.5")}
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm font-medium">
            Recency days
            <input
              type="number"
              {...register("recency_days")}
              className={cn(inputClass, "mt-1.5")}
            />
          </label>
          <label className="block text-sm font-medium">
            Notify threshold
            <input
              type="number"
              {...register("notify_threshold")}
              className={cn(inputClass, "mt-1.5")}
            />
          </label>
          <label className="block text-sm font-medium">
            Digest threshold
            <input
              type="number"
              {...register("digest_threshold")}
              className={cn(inputClass, "mt-1.5")}
            />
          </label>
        </div>
        <label className="block text-sm font-medium">
          Default resume layout
          <select {...register("default_layout_id")} className={cn(inputClass, "mt-1.5")}>
            <option value="">Site default</option>
            {layouts.map((layout) => (
              <option key={layout.id} value={layout.id}>
                {layout.name}
              </option>
            ))}
          </select>
        </label>
        <FormSaveButton saving={saving} onClick={handleSubmit(onSubmit)} />
      </form>
    </Form>
  );
}
