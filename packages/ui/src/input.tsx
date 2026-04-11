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
          "focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error ? "border-destructive" : "border-border",
          className,
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  ),
);

Input.displayName = "Input";
