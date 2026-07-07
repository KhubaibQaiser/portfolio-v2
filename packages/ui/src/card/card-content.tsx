import type { HTMLAttributes } from "react";
import { cn } from "@portfolio/shared/utils";

export function CardContent({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("text-muted-foreground text-sm", className)} {...props}>
      {children}
    </div>
  );
}
