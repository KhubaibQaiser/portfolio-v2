"use client";

import { DayPicker, type DayPickerProps } from "react-day-picker";
import { cn } from "@portfolio/shared/utils";

import "react-day-picker/style.css";

export type CalendarProps = DayPickerProps;

export function Calendar({ className, ...props }: CalendarProps) {
  return (
    <DayPicker
      {...props}
      className={cn(
        "rounded-lg border border-border bg-background p-2 text-foreground [--rdp-accent-color:var(--color-accent)] [--rdp-background-color:var(--color-background)]",
        className,
      )}
    />
  );
}
