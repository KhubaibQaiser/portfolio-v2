import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@portfolio/shared/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <div className="w-full">
      <input
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-lg border bg-transparent px-3 py-2 text-sm",
          "placeholder:text-muted-foreground/50",
          "focus:border-accent focus:ring-accent focus:ring-1 focus:outline-hidden",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error ? "border-destructive" : "border-border",
          className,
        )}
        {...props}
      />
      {error && <p className="text-destructive mt-1 text-xs">{error}</p>}
    </div>
  ),
);

Input.displayName = "Input";
