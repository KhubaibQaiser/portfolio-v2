"use client";

import { motion } from "framer-motion";
import { ArrowDown, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { HeroTechCarousel } from "@portfolio/ui/hero-tech-carousel";
import type { Database } from "@portfolio/shared/supabase/database.types";

type Hero = Database["public"]["Tables"]["hero"]["Row"];

type HeroSectionProps = {
  hero: Hero;
  companies: string[];
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.3 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function HeroSection({ hero, companies }: HeroSectionProps) {
  return (
    <section
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      aria-label="Hero"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent"
        aria-hidden
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 mx-auto max-w-[var(--container-max)] px-[var(--container-padding)] py-32 text-center"
      >
        <motion.p
          variants={itemVariants}
          className="font-mono text-sm text-accent md:text-base"
        >
          {hero.greeting}
        </motion.p>

        <motion.h1
          variants={itemVariants}
          className="mt-5 text-[length:var(--text-display)] font-bold leading-[1.1] tracking-tight"
        >
          {hero.name}
          <span className="text-accent">.</span>
        </motion.h1>

        <motion.h2
          variants={itemVariants}
          className="mt-3 text-[length:var(--text-h1)] font-semibold leading-tight tracking-tight text-muted-foreground"
        >
          {hero.headline}
        </motion.h2>

        <motion.p
          variants={itemVariants}
          className="mx-auto mt-6 max-w-2xl text-[length:var(--text-body-lg)] leading-relaxed text-muted-foreground"
        >
          {hero.value_proposition}
        </motion.p>

        <motion.div variants={itemVariants}>
          <HeroTechCarousel />
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <a
            href="#projects"
            className={cn(
              "rounded-full bg-accent px-8 py-3 text-sm font-medium text-accent-foreground",
              "transition-all duration-200 hover:opacity-90 active:scale-95",
              "shadow-md hover:shadow-lg",
            )}
          >
            {hero.cta_primary_text}
          </a>
          <a
            href="/resume"
            className={cn(
              "flex items-center gap-2 rounded-full border border-border px-8 py-3",
              "text-sm font-medium text-foreground transition-all duration-200",
              "hover:border-accent hover:text-accent active:scale-95",
            )}
          >
            <FileText className="h-4 w-4" />
            {hero.cta_secondary_text}
          </a>
        </motion.div>

        <motion.div variants={itemVariants} className="mt-16">
          <div
            className={cn(
              "mx-auto max-w-4xl rounded-2xl border border-border/80",
              "bg-muted/50 px-5 py-6 shadow-sm",
              "dark:border-border/60 dark:bg-muted/35",
            )}
          >
            <div className="mb-5 flex items-center justify-center gap-3">
              <span
                className="h-px w-10 shrink-0 bg-border sm:w-14"
                aria-hidden
              />
              <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground/90">
                Trusted by teams at
              </p>
              <span
                className="h-px w-10 shrink-0 bg-border sm:w-14"
                aria-hidden
              />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 sm:gap-x-10">
              {companies.map((company) => (
                <span
                  key={company}
                  className={cn(
                    "text-sm font-semibold tracking-tight text-foreground/85",
                    "transition-colors duration-200 hover:text-accent sm:text-base",
                  )}
                >
                  {company}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <ArrowDown className="h-5 w-5 text-muted-foreground/40" />
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
