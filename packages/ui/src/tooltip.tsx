"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@portfolio/shared/utils";

type TooltipSide = "top" | "bottom";

type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  side?: TooltipSide;
  offset?: number;
  delayMs?: number;
  className?: string;
};

type Position = {
  left: number;
  top: number;
};

function getPosition(
  target: HTMLElement,
  side: TooltipSide,
  offset: number,
): Position {
  const rect = target.getBoundingClientRect();
  const left = rect.left + rect.width / 2;
  const top = side === "top" ? rect.top - offset : rect.bottom + offset;
  return { left, top };
}

export function Tooltip({
  content,
  children,
  side = "top",
  offset = 10,
  delayMs = 120,
  className,
}: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const tooltipId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useMemo(
    () => () => {
      if (!triggerRef.current) return;
      setPosition(getPosition(triggerRef.current, side, offset));
    },
    [offset, side],
  );

  useEffect(() => {
    if (!open) return;

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function show() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      updatePosition();
      setOpen(true);
    }, delayMs);
  }

  function hide() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(false);
  }

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        aria-describedby={open ? tooltipId : undefined}
      >
        {children}
      </span>
      {mounted && open && position
        ? createPortal(
            <div
              id={tooltipId}
              role="tooltip"
              className={cn(
                "pointer-events-none fixed z-50 rounded-md border border-border/70 bg-background/95 px-2 py-1",
                "text-xs font-medium text-foreground shadow-md backdrop-blur",
                "-translate-x-1/2",
                side === "top"
                  ? "-translate-y-full"
                  : "translate-y-0",
                className,
              )}
              style={
                {
                  left: `${position.left}px`,
                  top: `${position.top}px`,
                } satisfies CSSProperties
              }
            >
              {content}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
