import type { HTMLAttributes } from "react";
import { cn } from "@portfolio/shared/utils";

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("font-semibold tracking-tight", className)} {...props}>
      {children}
    </h3>
  );
}
