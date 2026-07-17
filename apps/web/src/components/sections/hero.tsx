"use client";

import { motion } from "framer-motion";
import { ArrowDown, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { capturePortfolioEvent } from "@/lib/analytics/capture-client";
import { PortfolioEvents } from "@/lib/analytics/events";
import { HeroTechCarousel } from "@portfolio/ui/hero-tech-carousel";
import type { Hero } from "@portfolio/shared/schemas";

type HeroSectionProps = {
  hero: Hero;
  /** Name comes from Site Config (single source of truth). */
  name: string;
  companies: string[];
};

/** Embellishments only — never opacity-gate above-fold LCP text. */
const embellishmentVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function HeroSection({ hero, name, companies }: HeroSectionProps) {
  return (
    <section
      className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16"
      aria-label="Hero"
    >
      <div
        className="from-accent/5 pointer-events-none absolute inset-0 bg-linear-to-b via-transparent to-transparent"
        aria-hidden
      />

      <div className="max-w-container relative z-10 mx-auto w-full min-w-0 px-(--container-padding) py-16 text-center sm:py-24 md:py-32">
        {/* Visible in SSR HTML immediately — LCP must not wait on Framer Motion */}
        <p className="text-accent font-mono text-sm md:text-base">
          {hero.greeting}
        </p>

        <h1 className="text-display mt-5 leading-[1.1] font-bold tracking-tight text-balance">
          {name}
          <span className="text-accent">.</span>
        </h1>

        <h2 className="text-h1 text-muted-foreground mt-3 leading-tight font-semibold tracking-tight text-balance">
          {hero.headline}
        </h2>

        <p className="text-body-lg text-muted-foreground mx-auto mt-6 max-w-2xl leading-relaxed">
          {hero.value_proposition}
        </p>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={embellishmentVariants}
          transition={{ delay: 0.15 }}
        >
          <HeroTechCarousel />
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={embellishmentVariants}
          transition={{ delay: 0.25 }}
          className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <a
            href="#projects"
            onClick={() =>
              capturePortfolioEvent(PortfolioEvents.primaryNavClick, {
                href: "#projects",
                label: "hero_primary_cta",
              })
            }
            className={cn(
              "bg-accent text-accent-foreground rounded-full px-8 py-3 text-sm font-medium",
              "transition-all duration-200 hover:opacity-90 active:scale-95",
              "shadow-md hover:shadow-lg",
            )}
          >
            {hero.cta_primary_text}
          </a>
          <a
            href="/resume"
            onClick={() =>
              capturePortfolioEvent(PortfolioEvents.primaryNavClick, {
                href: "/resume",
                label: "hero_secondary_cta",
              })
            }
            className={cn(
              "border-border flex items-center gap-2 rounded-full border px-8 py-3",
              "text-foreground text-sm font-medium transition-all duration-200",
              "hover:border-accent hover:text-accent active:scale-95",
            )}
          >
            <FileText className="h-4 w-4" />
            {hero.cta_secondary_text}
          </a>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={embellishmentVariants}
          transition={{ delay: 0.35 }}
          className="mt-16"
        >
          <div
            className={cn(
              "border-border/80 mx-auto max-w-4xl rounded-2xl border",
              "bg-muted/50 px-5 py-6 shadow-sm",
              "dark:border-border/60 dark:bg-muted/35",
            )}
          >
            <div className="mb-5 flex items-center justify-center gap-3">
              <span className="bg-border h-px w-10 shrink-0 sm:w-14" aria-hidden />
              <p className="text-foreground/90 text-center text-[11px] font-semibold tracking-[0.2em] uppercase">
                Trusted by teams at
              </p>
              <span className="bg-border h-px w-10 shrink-0 sm:w-14" aria-hidden />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 sm:gap-x-10">
              {companies.map((company) => (
                <span
                  key={company}
                  className={cn(
                    "text-foreground/85 text-sm font-semibold tracking-tight",
                    "hover:text-accent transition-colors duration-200 sm:text-base",
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
            <ArrowDown className="text-muted-foreground/40 h-5 w-5" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
