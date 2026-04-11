import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@portfolio/shared/utils";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  hoverable?: boolean;
};

export function Card({ className, hoverable = false, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/50 bg-muted/30 p-6",
        hoverable && "transition-colors hover:border-accent/20 hover:bg-muted/50",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
