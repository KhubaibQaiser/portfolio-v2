"use client";

import { motion } from "framer-motion";
import { Layers, Bot, Globe, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Highlight } from "@portfolio/shared/schemas";

type WhyHireMeSectionProps = {
  /** Differentiator cards sourced from About (managed in the admin). */
  highlights: Highlight[];
};

// Decorative icons cycled by position — content lives in the database.
const ICONS = [Layers, Bot, Globe, Users] as const;

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

export function WhyHireMeSection({ highlights }: WhyHireMeSectionProps) {
  if (highlights.length === 0) return null;
  return (
    <section className="py-(--section-padding-y)" aria-label="Why Hire Me">
      <div className="mx-auto max-w-container px-(--container-padding)">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center text-h2 font-semibold tracking-tight"
        >
          Why Hire Me
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto mt-3 max-w-xl text-center text-body-lg text-muted-foreground"
        >
          What sets me apart from the other 50 senior engineers you&apos;re reviewing.
        </motion.p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {highlights.map(({ title, description }, i) => {
            const Icon = ICONS[i % ICONS.length]!;
            return (
            <motion.div
              key={title}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              className={cn(
                "group rounded-2xl border border-border/50 p-8",
                "bg-muted/20 transition-all duration-300",
                "hover:border-accent/30 hover:shadow-md",
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent/20">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">
                {title}
              </h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                {description}
              </p>
            </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
