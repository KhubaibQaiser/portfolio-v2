import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@portfolio/shared/utils";

type SelectVariant = "default" | "muted";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  error?: string;
  /** `muted` matches admin form fields (`bg-muted/30`). */
  variant?: SelectVariant;
};

const variantStyles: Record<SelectVariant, string> = {
  default: "bg-transparent",
  muted: "bg-muted/30",
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, variant = "default", children, ...props }, ref) => (
    <div className="w-full">
      <select
        ref={ref}
        className={cn(
          "flex h-10 w-full cursor-pointer appearance-none rounded-lg border px-3 py-2 text-sm",
          "focus:border-accent focus:ring-accent focus:ring-1 focus:outline-hidden",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "[&>option]:bg-background",
          error ? "border-destructive" : "border-border",
          variantStyles[variant],
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error ? <p className="text-destructive mt-1 text-xs">{error}</p> : null}
    </div>
  ),
);

Select.displayName = "Select";
