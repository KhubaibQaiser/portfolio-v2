"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@portfolio/shared/utils";
import { Button } from "./button";

/**
 * shadcn-style composable carousel: a root that owns state, and small parts you
 * arrange yourself. Native scroll-snap (swipe, trackpad, keyboard), no library.
 *
 *   <Carousel aria-label="Screenshots">
 *     <CarouselContent className="aspect-video rounded-2xl">
 *       <CarouselItem>…</CarouselItem>
 *     </CarouselContent>
 *     <CarouselPrevious />
 *     <CarouselNext />
 *     <CarouselDots />
 *   </Carousel>
 *
 * Previous/Next/Dots render nothing when there is only one slide.
 */

type CarouselContextValue = {
  trackRef: RefObject<HTMLDivElement | null>;
  index: number;
  count: number;
  goTo: (index: number) => void;
};

const CarouselContext = createContext<CarouselContextValue | null>(null);

function useCarousel(): CarouselContextValue {
  const context = useContext(CarouselContext);
  if (!context) throw new Error("Carousel parts must be used inside <Carousel>");
  return context;
}

function Carousel({ className, children, onKeyDown, ...props }: ComponentProps<"div">) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(0);

  const goTo = useCallback((next: number) => {
    const track = trackRef.current;
    if (!track) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    track.scrollTo({
      left: next * track.clientWidth,
      behavior: reduce ? "auto" : "smooth",
    });
  }, []);

  // Track slide count and the active slide from the DOM, so any content works.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const syncCount = () => setCount(track.children.length);
    const syncIndex = () => {
      if (track.clientWidth === 0) return;
      setIndex(Math.round(track.scrollLeft / track.clientWidth));
    };
    syncCount();
    track.addEventListener("scroll", syncIndex, { passive: true });
    const observer = new MutationObserver(syncCount);
    observer.observe(track, { childList: true });
    return () => {
      track.removeEventListener("scroll", syncIndex);
      observer.disconnect();
    };
  }, []);

  const value = useMemo(() => ({ trackRef, index, count, goTo }), [index, count, goTo]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      goTo(index - 1);
    } else if (event.key === "ArrowRight" && index < count - 1) {
      event.preventDefault();
      goTo(index + 1);
    }
  };

  return (
    <CarouselContext.Provider value={value}>
      <div
        data-slot="carousel"
        role="region"
        aria-roledescription="carousel"
        onKeyDown={handleKeyDown}
        className={cn("group/carousel relative", className)}
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
}

/** The scrolling viewport. Put the aspect ratio and radius on this. */
function CarouselContent({ className, ...props }: ComponentProps<"div">) {
  const { trackRef, count } = useCarousel();
  return (
    <div
      ref={trackRef}
      data-slot="carousel-content"
      tabIndex={count > 1 ? 0 : undefined}
      className={cn(
        "bg-muted flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        "focus-visible:ring-accent focus-visible:ring-2 focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
}

function CarouselItem({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="carousel-item"
      role="group"
      aria-roledescription="slide"
      className={cn("relative h-full w-full shrink-0 snap-center", className)}
      {...props}
    />
  );
}

// With a dots footer below the slides, re-centre the arrows on the slides only.
const arrowClass =
  "group-has-[[data-slot=carousel-dots]]/carousel:top-[calc(50%-0.75rem)] bg-background/80 hover:bg-background absolute top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full p-0 shadow-md backdrop-blur disabled:opacity-0";

function CarouselPrevious({ className, ...props }: ComponentProps<typeof Button>) {
  const { index, count, goTo } = useCarousel();
  if (count <= 1) return null;
  return (
    <Button
      data-slot="carousel-previous"
      variant="ghost"
      aria-label="Previous slide"
      disabled={index === 0}
      onClick={() => goTo(index - 1)}
      className={cn(arrowClass, "left-3", className)}
      {...props}
    >
      <ChevronLeft className="h-5 w-5" />
    </Button>
  );
}

function CarouselNext({ className, ...props }: ComponentProps<typeof Button>) {
  const { index, count, goTo } = useCarousel();
  if (count <= 1) return null;
  return (
    <Button
      data-slot="carousel-next"
      variant="ghost"
      aria-label="Next slide"
      disabled={index === count - 1}
      onClick={() => goTo(index + 1)}
      className={cn(arrowClass, "right-3", className)}
      {...props}
    >
      <ChevronRight className="h-5 w-5" />
    </Button>
  );
}

/** Dotted pagination footer; place it after `CarouselContent`. */
function CarouselDots({ className, ...props }: ComponentProps<"div">) {
  const { index, count, goTo } = useCarousel();
  if (count <= 1) return null;
  return (
    <div
      data-slot="carousel-dots"
      className={cn("mt-4 flex items-center justify-center gap-2", className)}
      {...props}
    >
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Go to slide ${i + 1}`}
          aria-current={i === index ? "true" : undefined}
          onClick={() => goTo(i)}
          className={cn(
            "focus-visible:ring-accent h-2 rounded-full transition-all focus-visible:ring-2 focus-visible:outline-none",
            i === index
              ? "bg-accent w-6"
              : "bg-muted-foreground/30 hover:bg-muted-foreground/60 w-2",
          )}
        />
      ))}
    </div>
  );
}

export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  CarouselDots,
};
