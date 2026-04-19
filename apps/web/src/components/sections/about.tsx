"use client";

import { motion } from "framer-motion";
import { MapPin, Clock, Briefcase, Globe, Users, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@portfolio/shared/supabase/database.types";

type About = Database["public"]["Tables"]["about"]["Row"];

type AboutSectionProps = {
  about: About;
  location: string;
  /** Distinct employers from Experience (not the stored `about.companies_count` field). */
  companiesCount: number;
};

const statusLabel: Record<string, string> = {
  available: "Open to Opportunities",
  open: "Open to Conversations",
  unavailable: "Not Available",
};

const sectionVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function AboutSection({ about, location, companiesCount }: AboutSectionProps) {
  const stats = [
    { icon: Clock, label: "Years", value: `${about.years_experience}+` },
    { icon: Briefcase, label: "Companies", value: String(companiesCount) },
    { icon: Globe, label: "Countries", value: String(about.countries_count) },
    { icon: FolderOpen, label: "Projects", value: `${about.projects_count}+` },
    { icon: Users, label: "Users Impacted", value: about.users_impacted },
  ];

  const paragraphs = about.bio.split("\n").filter(Boolean);

  return (
    <section
      id="about"
      className="py-(--section-padding-y)"
      aria-label="About"
    >
      <div className="mx-auto max-w-container px-(--container-padding)">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <h2 className="flex items-center gap-3 text-h2 font-semibold tracking-tight">
            <span className="font-mono text-base font-normal text-accent">
              01.
            </span>
            About Me
            <span className="ml-4 h-px flex-1 bg-border" aria-hidden />
          </h2>

          <div className="mt-10 grid gap-12 md:grid-cols-[3fr_2fr]">
            <div className="space-y-5 text-body-lg leading-relaxed text-muted-foreground">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <span className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium",
                  about.status === "available"
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : about.status === "open"
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      : "bg-red-500/10 text-red-600 dark:text-red-400",
                )}>
                  {about.status === "available" && (
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                    </span>
                  )}
                  {statusLabel[about.status] ?? about.status}
                </span>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {location} · {about.timezone}
                </span>
              </div>
            </div>

            <div className="flex items-start justify-center">
              <div className="relative">
                <div className="aspect-square w-64 overflow-hidden rounded-2xl bg-muted md:w-72">
                  {about.photo_url ? (
                    <img src={about.photo_url} alt="Portrait" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground/30">
                      Photo
                    </div>
                  )}
                </div>
                <div
                  className="absolute -bottom-3 -right-3 -z-10 h-full w-full rounded-2xl border-2 border-accent/30"
                  aria-hidden
                />
              </div>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {stats.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border border-border/50 p-5",
                  "bg-muted/30 transition-colors duration-200 hover:border-accent/30",
                )}
              >
                <Icon className="h-5 w-5 text-accent" />
                <span className="text-2xl font-bold tracking-tight">{value}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {about.industries.map((industry) => (
              <span
                key={industry}
                className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-muted-foreground"
              >
                {industry}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
