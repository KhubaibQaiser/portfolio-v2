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
          "from-accent/5 to-accent/5 bg-linear-to-br via-transparent",
        variant === "subtle" && "bg-muted/30",
        variant === "accent" && "bg-accent/5",
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--color-accent)_0%,transparent_70%)] opacity-[0.03]"
        aria-hidden
      />

      <div className="max-w-container relative mx-auto px-(--container-padding) text-center">
        {stat && (
          <p className="text-foreground font-mono text-5xl font-bold tracking-tight md:text-6xl">
            {stat}
          </p>
        )}
        {label && (
          <p className="text-muted-foreground mt-2 text-sm font-medium tracking-widest uppercase">
            {label}
          </p>
        )}
        {quote && (
          <blockquote className="text-h3 text-muted-foreground mx-auto max-w-2xl leading-relaxed font-medium italic">
            &ldquo;{quote}&rdquo;
          </blockquote>
        )}
      </div>
    </div>
  );
}
