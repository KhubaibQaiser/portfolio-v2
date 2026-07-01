"use client";

import type { LucideIcon } from "lucide-react";
import { GuardedLink } from "@/components/form";

type SectionCardProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
};

export function SectionCard({ href, label, icon: Icon, description }: SectionCardProps) {
  return (
    <GuardedLink
      href={href}
      className="group border-border/50 bg-muted/20 hover:border-accent/30 flex flex-col gap-2 rounded-xl border p-5 transition-all duration-200 hover:shadow-sm"
    >
      <div className="flex items-center gap-3">
        <Icon className="text-accent h-5 w-5" />
        <span className="font-medium">{label}</span>
      </div>
      <span className="text-muted-foreground text-sm">{description}</span>
    </GuardedLink>
  );
}
