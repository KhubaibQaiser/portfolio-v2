"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  SKILL_CATEGORIES,
  getSkillCategorySortWeight,
} from "@portfolio/shared/constants";
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

const groupVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.03 },
  },
};

const tagVariants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function SkillsSection({ skills }: SkillsSectionProps) {
  const grouped = skills.reduce<Record<string, Skill[]>>((acc, skill) => {
    const cat = skill.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {});

  const categoryBlocks = Object.entries(grouped)
    .map(([category, categorySkills]) => {
      const sortedSkills = [...categorySkills].sort((a, b) => b.years - a.years);
      return {
        category,
        categorySkills: sortedSkills,
        count: categorySkills.length,
        weight: getSkillCategorySortWeight(category),
      };
    })
    .sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      if (b.count !== a.count) return b.count - a.count;
      const labelA =
        SKILL_CATEGORIES[a.category as keyof typeof SKILL_CATEGORIES] ?? a.category;
      const labelB =
        SKILL_CATEGORIES[b.category as keyof typeof SKILL_CATEGORIES] ?? b.category;
      return labelA.localeCompare(labelB);
    });

  return (
    <section
      id="skills"
      className="bg-muted/30 py-(--section-padding-y)"
      aria-label="Skills"
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
              02.
            </span>
            Skills & Expertise
            <span className="ml-4 h-px flex-1 bg-border" aria-hidden />
          </h2>

          <div className="mt-9 grid grid-cols-1 gap-7 md:grid-cols-2 md:gap-x-8 md:gap-y-7 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-7">
            {categoryBlocks.map(({ category, categorySkills }) => (
              <motion.div
                key={category}
                variants={groupVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                className="space-y-3"
              >
                <h3 className="text-sm font-semibold uppercase tracking-wider text-accent">
                  {SKILL_CATEGORIES[category as keyof typeof SKILL_CATEGORIES] ?? category}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {categorySkills.map((skill) => (
                    <motion.span
                      key={skill.id}
                      variants={tagVariants}
                      className={cn(
                        "inline-flex items-center rounded-full border border-border/60 px-2.5 py-1",
                        "text-sm font-medium text-foreground/90",
                        "transition-all duration-200",
                        "hover:border-accent/40 hover:bg-accent/5 hover:text-accent",
                      )}
                    >
                      {skill.name}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
