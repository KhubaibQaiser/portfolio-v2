"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { SKILL_CATEGORIES } from "@portfolio/shared/constants";

type SkillItem = {
  name: string;
  proficiency: number;
};

const skillData: Record<string, SkillItem[]> = {
  frontend: [
    { name: "React 18", proficiency: 95 },
    { name: "Next.js", proficiency: 92 },
    { name: "TypeScript", proficiency: 93 },
    { name: "Tailwind CSS", proficiency: 90 },
    { name: "HTML5/CSS3", proficiency: 95 },
    { name: "Framer Motion", proficiency: 80 },
  ],
  mobile: [
    { name: "React Native", proficiency: 88 },
    { name: "Expo", proficiency: 82 },
    { name: "Kotlin", proficiency: 55 },
  ],
  backend: [
    { name: "Node.js", proficiency: 85 },
    { name: "REST API", proficiency: 90 },
    { name: "GraphQL", proficiency: 78 },
  ],
  cloud: [
    { name: "AWS Lambda", proficiency: 82 },
    { name: "AWS CDK", proficiency: 78 },
    { name: "DynamoDB", proficiency: 75 },
    { name: "S3 / CloudFront", proficiency: 80 },
    { name: "Firebase", proficiency: 75 },
    { name: "Vercel", proficiency: 88 },
  ],
  state: [
    { name: "Redux / RTK", proficiency: 88 },
    { name: "TanStack Query", proficiency: 85 },
    { name: "Zustand", proficiency: 80 },
    { name: "Apollo GraphQL", proficiency: 75 },
  ],
  devops: [
    { name: "Docker", proficiency: 70 },
    { name: "GitHub Actions", proficiency: 82 },
    { name: "Sentry", proficiency: 78 },
  ],
  testing: [
    { name: "Jest / RTL", proficiency: 80 },
    { name: "Playwright", proficiency: 70 },
    { name: "Detox", proficiency: 65 },
  ],
  tools: [
    { name: "Storybook", proficiency: 78 },
    { name: "Figma", proficiency: 72 },
    { name: "Linear / JIRA", proficiency: 85 },
  ],
};

const sectionVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function SkillsSection() {
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
            {Object.entries(skillData).map(([category, skills]) => (
              <div key={category} className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-accent">
                  {SKILL_CATEGORIES[category as keyof typeof SKILL_CATEGORIES] ?? category}
                </h3>
                <div className="space-y-3">
                  {skills.map((skill) => (
                    <div key={skill.name}>
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
