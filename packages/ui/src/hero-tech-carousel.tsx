"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@portfolio/shared/utils";
import { HERO_TOP_TECHS, type HeroTopTech } from "@portfolio/shared/constants";
import { Tooltip } from "./tooltip";
import { AwsIcon } from "./icons/aws-icon";
import { getHeroSimpleIcon } from "./hero-tech-icon-map";
import "./hero-tech-carousel.css";

export type HeroTechCarouselProps = {
  /** Defaults to curated list from shared constants. */
  items?: HeroTopTech[];
  className?: string;
};

const LOOP_CLONES = 6;

export function HeroTechCarousel({ items = HERO_TOP_TECHS, className }: HeroTechCarouselProps) {
  const prefersReducedMotion = useReducedMotion();
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [segmentWidth, setSegmentWidth] = useState(0);
  const firstSegmentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const firstSegment = firstSegmentRef.current;
    if (!firstSegment) return;

    const updateWidth = () => {
      setSegmentWidth(firstSegment.getBoundingClientRect().width);
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(firstSegment);

    return () => observer.disconnect();
  }, []);

  const loopSets = useMemo(
    () =>
      prefersReducedMotion ? [items] : Array.from({ length: LOOP_CLONES }, () => items),
    [prefersReducedMotion, items],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className={cn("relative mx-auto mt-8 w-full min-w-0 max-w-3xl", className)}
      aria-label="Top technologies"
    >
      <div className="hero-tech-marquee-root group relative overflow-hidden rounded-full border border-border/60 bg-background/30 px-3 py-2.5 backdrop-blur-sm">
        <div
          className={cn(
            "flex w-max items-center gap-3.5 will-change-transform",
            !prefersReducedMotion && segmentWidth > 0 && "hero-tech-marquee-track",
          )}
          style={
            !prefersReducedMotion && segmentWidth > 0
              ? ({
                  "--hero-marquee-distance": `${segmentWidth}px`,
                  "--hero-marquee-duration": `${Math.max(segmentWidth / 45, 18)}s`,
                } as CSSProperties)
              : undefined
          }
        >
          {loopSets.map((setItems, setIndex) => (
            <div
              key={`set-${setIndex}`}
              ref={setIndex === 0 ? firstSegmentRef : undefined}
              className="flex shrink-0 items-center gap-3.5"
            >
              {setItems.map((tech) => {
                const activeKey = `${setIndex}-${tech.id}`;
                const isActive = activeItem === activeKey;
                const isMonoBrand = tech.id === "nextjs" || tech.id === "vercel";

                const buttonClass = cn(
                  "inline-flex h-12 w-12 items-center justify-center rounded-full border border-transparent",
                  "transition-all duration-200",
                  isActive && "scale-105",
                  isMonoBrand && "hero-tech-mono-brand",
                  "hover:border-border/70 hover:bg-muted/40 focus-visible:border-border/70 focus-visible:bg-muted/40 focus-visible:outline-none",
                );

                if (tech.iconKey === "AwsBrand") {
                  return (
                    <Tooltip
                      key={`${tech.id}-${setIndex}`}
                      content={tech.label}
                      offset={12}
                    >
                      <button
                        type="button"
                        aria-label={tech.label}
                        className={buttonClass}
                        onMouseEnter={() => setActiveItem(activeKey)}
                        onMouseLeave={() => setActiveItem(null)}
                        onFocus={() => setActiveItem(activeKey)}
                        onBlur={() => setActiveItem(null)}
                      >
                        <AwsIcon
                          width={24}
                          height={24}
                          accentColor={tech.brandColor ?? "#FF9900"}
                          className="transition-colors duration-200"
                        />
                      </button>
                    </Tooltip>
                  );
                }

                const SimpleIcon = getHeroSimpleIcon(tech.iconKey);
                if (!SimpleIcon) return null;

                return (
                  <Tooltip
                    key={`${tech.id}-${setIndex}`}
                    content={tech.label}
                    offset={12}
                  >
                    <button
                      type="button"
                      aria-label={tech.label}
                      className={buttonClass}
                      onMouseEnter={() => setActiveItem(activeKey)}
                      onMouseLeave={() => setActiveItem(null)}
                      onFocus={() => setActiveItem(activeKey)}
                      onBlur={() => setActiveItem(null)}
                    >
                      <SimpleIcon
                        width={24}
                        height={24}
                        color={isMonoBrand ? "currentColor" : (tech.brandColor ?? undefined)}
                        className="transition-colors duration-200"
                      />
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent"
          aria-hidden
        />
      </div>
    </motion.div>
  );
}
