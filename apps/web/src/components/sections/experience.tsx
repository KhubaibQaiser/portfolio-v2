"use client";

import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { Badge } from "@portfolio/ui/badge";
import { getContractTypeLabel } from "@portfolio/shared/schemas";
import type { Experience } from "@portfolio/shared/schemas";

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
    <section id="experience" className="py-(--section-padding-y)" aria-label="Experience">
      <div className="max-w-container mx-auto px-(--container-padding)">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <h2 className="text-h2 flex items-center gap-3 font-semibold tracking-tight">
            <span className="text-accent font-mono text-base font-normal">03.</span>
            Where I&apos;ve Worked
            <span className="bg-border ml-4 h-px flex-1" aria-hidden />
          </h2>

          <div className="relative mt-10">
            <div
              className="bg-border absolute top-0 left-4 hidden h-full w-px md:left-8 md:block"
              aria-hidden
            />

            <div className="space-y-10">
              {experience.map((exp, i) => {
                const period = `${exp.start_date} – ${exp.end_date ?? "Present"}`;
                const bullets = exp.description.split("\n").filter(Boolean);
                const locationType =
                  exp.location_type.charAt(0).toUpperCase() + exp.location_type.slice(1);
                const jobType = getContractTypeLabel(exp.contract_type);

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
                      className="border-accent bg-background absolute top-2 left-2.5 hidden h-3 w-3 rounded-full border-2 md:left-6.5 md:block"
                      aria-hidden
                    />

                    <div className="border-border/50 bg-muted/20 hover:border-accent/20 rounded-xl border p-6 transition-all duration-200 hover:shadow-sm">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">{exp.role}</h3>
                          <p className="text-accent">{exp.company}</p>
                        </div>
                        <div className="text-muted-foreground flex items-center gap-3 text-sm">
                          <span className="font-mono">{period}</span>
                        </div>
                      </div>

                      <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-sm">
                        <span className="inline-flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {exp.location}
                        </span>
                        <Badge
                          variant="default"
                          className="border-transparent font-normal"
                        >
                          {locationType}
                        </Badge>
                        <Badge
                          variant="default"
                          className="border-transparent font-normal"
                        >
                          {jobType}
                        </Badge>
                      </div>

                      <ul className="mt-4 space-y-2">
                        {bullets.map((item, idx) => (
                          <li
                            key={idx}
                            className="text-muted-foreground flex gap-2 text-sm leading-relaxed"
                          >
                            <span className="bg-accent mt-1.5 h-1 w-1 shrink-0 rounded-full" />
                            {item}
                          </li>
                        ))}
                      </ul>

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {exp.tech_tags.map((t) => (
                          <Badge
                            key={t}
                            variant="accent"
                            className="font-mono font-normal"
                          >
                            {t}
                          </Badge>
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
