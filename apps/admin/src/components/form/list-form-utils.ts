import type { FieldValues, UseFormReturn } from "react-hook-form";
import { confirmLeave } from "@/components/form/form-state";

export function getDeletedIds<T extends { id: string }>(
  initialData: T[],
  items: T[],
): string[] {
  const currentIds = new Set(items.map((item) => item.id));
  return initialData.filter((item) => !currentIds.has(item.id)).map((item) => item.id);
}

export function tryLeaveForm<T extends FieldValues>(
  form: UseFormReturn<T>,
  initialValues: T,
): boolean {
  if (!form.formState.isDirty) return true;
  if (!confirmLeave()) return false;
  form.reset(initialValues);
  return true;
}
