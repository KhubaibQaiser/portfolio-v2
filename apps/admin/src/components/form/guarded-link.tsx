"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { confirmLeave } from "@/components/form/form-state";

type GuardedLinkProps = ComponentProps<typeof Link>;

export function GuardedLink({ onNavigate, ...props }: GuardedLinkProps) {
  return (
    <Link
      {...props}
      onNavigate={(event) => {
        if (!confirmLeave()) {
          event.preventDefault();
          return;
        }
        onNavigate?.(event);
      }}
    />
  );
}
