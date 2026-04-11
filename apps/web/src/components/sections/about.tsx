"use client";

import { motion } from "framer-motion";
import { MapPin, Clock, Briefcase, Globe, Users, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const stats = [
  { icon: Clock, label: "Years", value: "11+" },
  { icon: Briefcase, label: "Companies", value: "6" },
  { icon: Globe, label: "Countries", value: "4" },
  { icon: FolderOpen, label: "Projects", value: "30+" },
  { icon: Users, label: "Users Impacted", value: "500K+" },
];

const industries = ["Ad-Tech", "E-Commerce", "SaaS", "EdTech", "FinTech"];

const sectionVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function AboutSection() {
  return (
    <section
      id="about"
      className="py-[var(--section-padding-y)]"
      aria-label="About"
    >
      <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-padding)]">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {/* Section heading */}
          <h2 className="flex items-center gap-3 text-[length:var(--text-h2)] font-semibold tracking-tight">
            <span className="font-mono text-base font-normal text-accent">
              01.
            </span>
            About Me
            <span className="ml-4 h-px flex-1 bg-border" aria-hidden />
          </h2>

          <div className="mt-10 grid gap-12 md:grid-cols-[3fr_2fr]">
            {/* Text content */}
            <div className="space-y-5 text-[length:var(--text-body-lg)] leading-relaxed text-muted-foreground">
              <p>
                I&apos;m a Senior Software Engineer with over a decade of experience
                building high-performance web and mobile applications across Ad-Tech,
                E-Commerce, SaaS, and EdTech industries. Currently at{" "}
                <span className="font-medium text-foreground">Shopsense AI</span>,
                where I architect serverless systems on AWS handling 50K+ daily ad
                impressions.
              </p>
              <p>
                My expertise spans the full stack — from crafting pixel-perfect React
                interfaces to designing cloud infrastructure with AWS CDK, Lambda, and
                DynamoDB. I&apos;ve led teams, built design systems used by 40+
                engineers, and consistently delivered measurable performance
                improvements (60% CWV boost, 20%+ engagement increase).
              </p>
              <p>
                I use AI as a force multiplier — not a crutch. It helps me ship 3x
                faster while maintaining code quality I can defend in any review. This
                portfolio was built with AI assistance, and every line is
                production-grade.
              </p>

              {/* Status badge */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <span className="flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-1.5 text-sm font-medium text-green-600 dark:text-green-400">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                  </span>
                  Open to Opportunities
                </span>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  Islamabad, Pakistan · GMT+5
                </span>
              </div>
            </div>

            {/* Photo placeholder */}
            <div className="flex items-start justify-center">
              <div className="relative">
                <div className="aspect-square w-64 overflow-hidden rounded-2xl bg-muted md:w-72">
                  <div className="flex h-full items-center justify-center text-muted-foreground/30">
                    Photo
                  </div>
                </div>
                <div
                  className="absolute -bottom-3 -right-3 -z-10 h-full w-full rounded-2xl border-2 border-accent/30"
                  aria-hidden
                />
              </div>
            </div>
          </div>

          {/* Stats */}
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

          {/* Industries */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {industries.map((industry) => (
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
