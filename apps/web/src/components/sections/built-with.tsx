"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const techStack = [
  "Next.js 15",
  "React 19",
  "TypeScript",
  "Tailwind CSS v4",
  "Framer Motion",
  "Supabase",
  "Vercel",
  "Turborepo",
  "pnpm",
  "shadcn/ui",
  "Vercel AI SDK",
  "Groq",
  "PostHog",
  "Cloudflare R2",
  "Upstash Redis",
];

const sectionVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function BuiltWithSection() {
  return (
    <section className="bg-muted/30 py-[var(--section-padding-y)]" aria-label="How this was built">
      <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-padding)]">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <h2 className="text-center text-[length:var(--text-h2)] font-semibold tracking-tight">
            How This Portfolio Was Built
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-[length:var(--text-body-lg)] text-muted-foreground">
            This portfolio is itself a technical showcase — a Turborepo monorepo
            with two Next.js apps, server-side AI chat, and edge-cached
            performance.
          </p>

          {/* Tech pills */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {techStack.map((tech) => (
              <span
                key={tech}
                className={cn(
                  "rounded-full border border-border px-3 py-1.5 text-sm font-medium",
                  "text-muted-foreground transition-colors duration-200",
                  "hover:border-accent/30 hover:text-foreground",
                )}
              >
                {tech}
              </span>
            ))}
          </div>

          {/* AI transparency */}
          <div className="mx-auto mt-10 max-w-2xl rounded-xl border border-border/50 bg-background p-6 text-center">
            <p className="text-sm font-medium text-foreground">
              Built with AI Assistance
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              I used AI tools (Cursor + Claude) to accelerate development of
              this portfolio — architecture design, code generation, and
              content optimization. Every decision was validated, every line
              was reviewed. AI is my co-pilot, not my autopilot.
            </p>
          </div>

          {/* Stats */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-center">
            {[
              ["15+", "Components"],
              ["10+", "Pages"],
              ["100/100", "Lighthouse Target"],
              ["<100ms", "TTFB Target"],
            ].map(([value, label]) => (
              <div key={label} className="px-3">
                <p className="font-mono text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
