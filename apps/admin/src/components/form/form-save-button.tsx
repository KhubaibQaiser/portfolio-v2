"use client";

import { Save, Loader2 } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";

type FormSaveButtonProps = {
  saving?: boolean;
  onClick: () => void;
  className?: string;
};

export function FormSaveButton({
  saving = false,
  onClick,
  className,
}: FormSaveButtonProps) {
  const {
    formState: { isDirty },
  } = useFormContext();

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isDirty || saving}
      className={cn(
        "bg-accent text-accent-foreground flex items-center gap-2 rounded-lg px-5 py-2.5",
        "text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50",
        className,
      )}
    >
      {saving ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Save className="h-4 w-4" />
      )}
      {saving ? "Saving..." : "Save"}
    </button>
  );
}
