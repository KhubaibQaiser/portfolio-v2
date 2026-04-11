"use client";

import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import type { Database } from "@portfolio/shared/supabase/database.types";

type Experience = Database["public"]["Tables"]["experience"]["Row"];

type ExperienceSectionProps = {
  experience: Experience[];
};

const sectionVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function ExperienceSection({ experience }: ExperienceSectionProps) {
  return (
    <section
      id="experience"
      className="py-[var(--section-padding-y)]"
      aria-label="Experience"
    >
      <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-padding)]">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <h2 className="flex items-center gap-3 text-[length:var(--text-h2)] font-semibold tracking-tight">
            <span className="font-mono text-base font-normal text-accent">
              03.
            </span>
            Where I&apos;ve Worked
            <span className="ml-4 h-px flex-1 bg-border" aria-hidden />
          </h2>

          <div className="relative mt-10">
            <div
              className="absolute left-4 top-0 hidden h-full w-px bg-border md:left-8 md:block"
              aria-hidden
            />

            <div className="space-y-10">
              {experience.map((exp, i) => {
                const period = `${exp.start_date} – ${exp.end_date ?? "Present"}`;
                const bullets = exp.description.split("\n").filter(Boolean);
                const locationType = exp.location_type.charAt(0).toUpperCase() + exp.location_type.slice(1);

                return (
                  <motion.div
                    key={exp.id}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{
                      delay: i * 0.05,
                      duration: 0.5,
                      ease: [0.22, 1, 0.36, 1] as const,
                    }}
                    className="relative pl-0 md:pl-20"
                  >
                    <div
                      className="absolute left-2.5 top-2 hidden h-3 w-3 rounded-full border-2 border-accent bg-background md:left-6.5 md:block"
                      aria-hidden
                    />

                    <div className="rounded-xl border border-border/50 bg-muted/20 p-6 transition-all duration-200 hover:border-accent/20 hover:shadow-sm">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">{exp.role}</h3>
                          <p className="text-accent">{exp.company}</p>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="font-mono">{period}</span>
                        </div>
                      </div>

                      <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {exp.location}
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                          {locationType}
                        </span>
                      </div>

                      <ul className="mt-4 space-y-2">
                        {bullets.map((item, idx) => (
                          <li
                            key={idx}
                            className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
                          >
                            <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-accent" />
                            {item}
                          </li>
                        ))}
                      </ul>

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {exp.tech_tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-accent/10 px-2.5 py-0.5 font-mono text-xs text-accent"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
