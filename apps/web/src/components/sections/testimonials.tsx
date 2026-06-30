"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ExternalLink, Quote, User } from "lucide-react";
import {
  truncateRecommendationDescription,
  type Testimonial,
} from "@portfolio/shared/schemas";
import { formatRecommendationDate } from "@portfolio/shared/recommendation-dates";

type TestimonialsProps = {
  testimonials: Testimonial[];
};

function RecommenderAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  const [failed, setFailed] = useState(false);

  if (avatarUrl && !failed) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={40}
        height={40}
        unoptimized
        className="border-border/50 h-10 w-10 shrink-0 rounded-full border object-cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className="bg-muted border-border/50 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border">
      <User className="text-muted-foreground h-5 w-5" aria-hidden />
    </div>
  );
}

export function Testimonials({ testimonials }: TestimonialsProps) {
  const visible = testimonials.filter((t) => t.description.trim().length > 0);
  if (visible.length === 0) return null;

  return (
    <section id="recommendations" className="py-(--section-padding-y)">
      <div className="max-w-container mx-auto px-(--container-padding)">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
          className="text-center"
        >
          <h2 className="text-h2 font-bold tracking-tight">Recommendations</h2>
          <p className="text-body-lg text-muted-foreground mx-auto mt-4 max-w-xl">
            Recommendations from colleagues and leaders
          </p>
        </motion.div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {visible.map((t, i) => {
            const formattedDate = formatRecommendationDate(t.recommended_at);
            const { preview, isTruncated } = truncateRecommendationDescription(
              t.description,
            );

            return (
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
                className="border-border/50 bg-muted/30 hover:border-accent/20 relative flex flex-col rounded-2xl border p-6 transition-colors"
              >
                <Quote className="text-accent/30 mb-4 h-8 w-8" />
                <blockquote className="text-muted-foreground flex-1 text-sm leading-relaxed">
                  &ldquo;{preview}
                  {isTruncated ? "…" : ""}&rdquo;
                  {isTruncated && t.linkedin_url.trim() ? (
                    <>
                      {" "}
                      <a
                        href={t.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent font-medium hover:underline"
                      >
                        Read full
                      </a>
                    </>
                  ) : null}
                </blockquote>
                <div className="border-border/50 mt-6 border-t pt-4">
                  <div className="flex items-start gap-3">
                    <RecommenderAvatar name={t.full_name} avatarUrl={t.avatar_url} />
                    <div className="min-w-0 flex-1">
                      {t.profile_url.trim() ? (
                        <a
                          href={t.profile_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-foreground hover:text-accent text-sm font-semibold transition-colors"
                        >
                          {t.full_name}
                        </a>
                      ) : (
                        <p className="text-foreground text-sm font-semibold">
                          {t.full_name}
                        </p>
                      )}
                      <p className="text-muted-foreground text-xs">
                        {t.role_title}
                        {formattedDate ? ` · ${formattedDate}` : null}
                      </p>
                    </div>
                  </div>
                  {t.linkedin_url.trim() ? (
                    <a
                      href={t.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent mt-3 inline-flex items-center gap-1 text-xs font-medium hover:underline"
                    >
                      Verify on LinkedIn
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  ) : null}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
