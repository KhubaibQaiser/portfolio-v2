"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { MapPin, Clock, Briefcase, Globe, Users, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { About } from "@portfolio/shared/schemas";

type AboutSectionProps = {
  about: About;
  location: string;
  /** Distinct employers from Experience (not the stored `about.companies_count` field). */
  companiesCount: number;
  name: string;
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

export function AboutSection({
  about,
  location,
  companiesCount,
  name,
}: AboutSectionProps) {
  const stats = [
    { icon: Clock, label: "Years", value: `${about.years_experience}+` },
    { icon: Briefcase, label: "Companies", value: String(companiesCount) },
    { icon: Globe, label: "Countries", value: String(about.countries_count) },
    { icon: FolderOpen, label: "Projects", value: `${about.projects_count}+` },
    { icon: Users, label: "Users Impacted", value: about.users_impacted },
  ];

  const paragraphs = about.bio.split("\n").filter(Boolean);

  return (
    <section id="about" className="py-(--section-padding-y)" aria-label="About">
      <div className="max-w-container mx-auto px-(--container-padding)">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <h2 className="text-h2 flex items-center gap-3 font-semibold tracking-tight">
            <span className="text-accent font-mono text-base font-normal">01.</span>
            About Me
            <span className="bg-border ml-4 h-px flex-1" aria-hidden />
          </h2>

          <div className="mt-10 grid gap-12 md:grid-cols-[3fr_2fr]">
            <div className="text-body-lg text-muted-foreground space-y-5 leading-relaxed">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <span
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium",
                    about.status === "available"
                      ? "bg-green-500/10 text-green-600 dark:text-green-400"
                      : about.status === "open"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : "bg-red-500/10 text-red-600 dark:text-red-400",
                  )}
                >
                  {about.status === "available" && (
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                    </span>
                  )}
                  {statusLabel[about.status] ?? about.status}
                </span>
                <span className="text-muted-foreground flex items-center gap-1 text-sm">
                  <MapPin className="h-3.5 w-3.5" />
                  {location} · {about.timezone}
                </span>
              </div>
            </div>

            <div className="flex items-start justify-center">
              <div className="relative">
                <div className="bg-muted relative aspect-square w-64 overflow-hidden rounded-2xl md:w-72">
                  {about.photo_url ? (
                    <Image
                      src={about.photo_url}
                      alt={`Portrait of ${name}`}
                      fill
                      sizes="(min-width: 768px) 288px, 256px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="text-muted-foreground/30 flex h-full items-center justify-center">
                      Photo
                    </div>
                  )}
                </div>
                <div
                  className="border-accent/30 absolute -right-3 -bottom-3 -z-10 h-full w-full rounded-2xl border-2"
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
                  "border-border/50 flex flex-col items-center gap-2 rounded-xl border p-5",
                  "bg-muted/30 hover:border-accent/30 transition-colors duration-200",
                )}
              >
                <Icon className="text-accent h-5 w-5" />
                <span className="text-2xl font-bold tracking-tight">{value}</span>
                <span className="text-muted-foreground text-xs">{label}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {about.industries.map((industry) => (
              <span
                key={industry}
                className="border-border text-muted-foreground rounded-full border px-4 py-1.5 text-sm font-medium"
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
