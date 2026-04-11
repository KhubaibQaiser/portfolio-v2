"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { SKILL_CATEGORIES } from "@portfolio/shared/constants";
import type { Database } from "@portfolio/shared/supabase/database.types";

type Skill = Database["public"]["Tables"]["skills"]["Row"];

type SkillsSectionProps = {
  skills: Skill[];
};

const sectionVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function SkillsSection({ skills }: SkillsSectionProps) {
  const grouped = skills.reduce<Record<string, Skill[]>>((acc, skill) => {
    const cat = skill.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {});

  return (
    <section
      id="skills"
      className="bg-muted/30 py-[var(--section-padding-y)]"
      aria-label="Skills"
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
              02.
            </span>
            Skills & Expertise
            <span className="ml-4 h-px flex-1 bg-border" aria-hidden />
          </h2>

          <div className="mt-10 grid gap-8 md:grid-cols-2">
            {Object.entries(grouped).map(([category, categorySkills]) => (
              <div key={category} className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-accent">
                  {SKILL_CATEGORIES[category as keyof typeof SKILL_CATEGORIES] ?? category}
                </h3>
                <div className="space-y-3">
                  {categorySkills.map((skill) => (
                    <div key={skill.id}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-medium">{skill.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {skill.proficiency}%
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-border">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${skill.proficiency}%` }}
                          viewport={{ once: true }}
                          transition={{
                            duration: 0.8,
                            ease: [0.22, 1, 0.36, 1] as const,
                            delay: 0.1,
                          }}
                          className={cn(
                            "h-full rounded-full",
                            skill.proficiency >= 85
                              ? "bg-accent"
                              : skill.proficiency >= 70
                                ? "bg-accent/70"
                                : "bg-accent/50",
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
