"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import type { Database } from "@portfolio/shared/supabase/database.types";

type Testimonial = Database["public"]["Tables"]["testimonials"]["Row"];

type TestimonialsProps = {
  testimonials: Testimonial[];
};

export function Testimonials({ testimonials }: TestimonialsProps) {
  if (testimonials.length === 0) return null;

  return (
    <section
      id="testimonials"
      className="py-(--section-padding-y)"
    >
      <div className="mx-auto max-w-container px-(--container-padding)">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
          className="text-center"
        >
          <h2 className="text-h2 font-bold tracking-tight">
            What People Say
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-body-lg text-muted-foreground">
            Feedback from leaders and colleagues I&apos;ve had the privilege of
            working with.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {testimonials.map((t, i) => (
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
