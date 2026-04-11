"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const TESTIMONIALS = [
  {
    id: "1",
    quote:
      "Khubaib is one of the most skilled frontend engineers I've worked with. He took ownership of our ad delivery platform and delivered a production-grade system that handles tens of thousands of impressions daily.",
    author_name: "Alex Rivera",
    author_title: "CTO",
    company: "Shopsense AI",
  },
  {
    id: "2",
    quote:
      "His work on migrating our legacy CRA apps to Vite was flawless. Build times dropped by 70% and developer satisfaction went through the roof. Khubaib consistently ships high-quality, well-tested code.",
    author_name: "Sarah Chen",
    author_title: "Engineering Manager",
    company: "Achieve",
  },
  {
    id: "3",
    quote:
      "Khubaib created our entire design system from scratch as a private npm package. It unified the UI across 8 teams and 40+ engineers. His attention to DX and component API design is exceptional.",
    author_name: "Adi Prasetyo",
    author_title: "VP of Engineering",
    company: "GudangAda",
  },
];

export function Testimonials() {
  return (
    <section
      id="testimonials"
      className="py-[length:var(--section-padding-y)]"
    >
      <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-padding)]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
          className="text-center"
        >
          <h2 className="text-[length:var(--text-h2)] font-bold tracking-tight">
            What People Say
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[length:var(--text-body-lg)] text-muted-foreground">
            Feedback from leaders and colleagues I&apos;ve had the privilege of
            working with.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.5,
                delay: i * 0.15,
                ease: [0.22, 1, 0.36, 1] as const,
              }}
              className="relative rounded-2xl border border-border/50 bg-muted/30 p-6 transition-colors hover:border-accent/20"
            >
              <Quote className="mb-4 h-8 w-8 text-accent/30" />
              <blockquote className="text-sm leading-relaxed text-muted-foreground">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div className="mt-6 border-t border-border/50 pt-4">
                <p className="text-sm font-semibold text-foreground">
                  {t.author_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.author_title}, {t.company}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
