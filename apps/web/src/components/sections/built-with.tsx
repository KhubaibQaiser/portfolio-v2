"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type BuiltWithSectionProps = {
  /** Tech pills sourced from Site Config (managed in the admin). */
  techStack: string[];
};

const sectionVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function BuiltWithSection({ techStack }: BuiltWithSectionProps) {
  return (
    <section
      className="bg-muted/30 py-(--section-padding-y)"
      aria-label="How this was built"
    >
      <div className="max-w-container mx-auto px-(--container-padding)">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <h2 className="text-h2 text-center font-semibold tracking-tight">
            How This Portfolio Was Built
          </h2>
          <p className="text-muted-foreground text-body-lg mx-auto mt-3 max-w-xl text-center">
            This portfolio is itself a technical showcase — a Turborepo monorepo with two
            Next.js apps, server-side AI chat, and edge-cached performance.
          </p>

          {/* Tech pills */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {techStack.map((tech) => (
              <span
                key={tech}
                className={cn(
                  "border-border rounded-full border px-3 py-1.5 text-sm font-medium",
                  "text-muted-foreground transition-colors duration-200",
                  "hover:border-accent/30 hover:text-foreground",
                )}
              >
                {tech}
              </span>
            ))}
          </div>

          {/* AI transparency */}
          <div className="border-border/50 bg-background mx-auto mt-10 max-w-2xl rounded-xl border p-6 text-center">
            <p className="text-foreground text-sm font-medium">
              Built with AI Assistance
            </p>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              I used AI tools (Cursor + Claude) to accelerate development of this
              portfolio — architecture design, code generation, and content optimization.
              Every decision was validated, every line was reviewed. AI is my co-pilot,
              not my autopilot.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
