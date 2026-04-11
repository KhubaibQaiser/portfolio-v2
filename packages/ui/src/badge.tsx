import type { HTMLAttributes } from "react";
import { cn } from "@portfolio/shared/utils";

type BadgeVariant = "default" | "accent" | "outline" | "success";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-muted text-muted-foreground",
  accent: "bg-accent/10 text-accent border-accent/30",
  outline: "border-border text-muted-foreground",
  success: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
