import { cn } from "@portfolio/shared/utils";

type StatDividerProps = {
  quote?: string;
  stat?: string;
  label?: string;
  variant?: "gradient" | "subtle" | "accent";
};

export function StatDivider({
  quote,
  stat,
  label,
  variant = "gradient",
}: StatDividerProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden py-24 md:py-32",
        variant === "gradient" &&
          "bg-linear-to-br from-accent/5 via-transparent to-accent/5",
        variant === "subtle" && "bg-muted/30",
        variant === "accent" && "bg-accent/5",
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--color-accent)_0%,transparent_70%)] opacity-[0.03]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-container px-(--container-padding) text-center">
        {stat && (
          <p className="font-mono text-5xl font-bold tracking-tight text-foreground md:text-6xl">
            {stat}
          </p>
        )}
        {label && (
          <p className="mt-2 text-sm font-medium uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
        )}
        {quote && (
          <blockquote className="mx-auto max-w-2xl text-h3 font-medium italic leading-relaxed text-muted-foreground">
            &ldquo;{quote}&rdquo;
          </blockquote>
        )}
      </div>
    </div>
  );
}
