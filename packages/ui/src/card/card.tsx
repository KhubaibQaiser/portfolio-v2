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
        "border-border/50 bg-muted/30 rounded-2xl border p-6",
        hoverable && "hover:border-accent/20 hover:bg-muted/50 transition-colors",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
