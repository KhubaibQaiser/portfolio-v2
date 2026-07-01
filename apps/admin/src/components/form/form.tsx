"use client";

import { useEffect, type ReactNode } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { FormProvider } from "react-hook-form";
import { setFormDirty } from "@/components/form/form-state";

type FormProps<T extends FieldValues> = UseFormReturn<T> & {
  isSubmitting?: boolean;
  children: ReactNode;
};

export function Form<T extends FieldValues>({
  children,
  isSubmitting = false,
  ...form
}: FormProps<T>) {
  const isDirty = form.formState.isDirty;
  const preventLeave = isDirty && !isSubmitting;

  useEffect(() => {
    setFormDirty(preventLeave);
    return () => setFormDirty(false);
  }, [preventLeave]);

  useEffect(() => {
    if (!preventLeave) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [preventLeave]);

  return <FormProvider {...form}>{children}</FormProvider>;
}
