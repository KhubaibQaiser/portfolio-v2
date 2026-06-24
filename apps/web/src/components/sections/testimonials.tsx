"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import type { Testimonial } from "@portfolio/shared/schemas";

type TestimonialsProps = {
  testimonials: Testimonial[];
};

export function Testimonials({ testimonials }: TestimonialsProps) {
  if (testimonials.length === 0) return null;

  return (
    <section id="testimonials" className="py-(--section-padding-y)">
      <div className="max-w-container mx-auto px-(--container-padding)">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
          className="text-center"
        >
          <h2 className="text-h2 font-bold tracking-tight">What People Say</h2>
          <p className="text-body-lg text-muted-foreground mx-auto mt-4 max-w-xl">
            Feedback from leaders and colleagues I&apos;ve had the privilege of working
            with.
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
              className="border-border/50 bg-muted/30 hover:border-accent/20 relative rounded-2xl border p-6 transition-colors"
            >
              <Quote className="text-accent/30 mb-4 h-8 w-8" />
              <blockquote className="text-muted-foreground text-sm leading-relaxed">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div className="border-border/50 mt-6 border-t pt-4">
                <p className="text-foreground text-sm font-semibold">{t.author_name}</p>
                <p className="text-muted-foreground text-xs">
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
