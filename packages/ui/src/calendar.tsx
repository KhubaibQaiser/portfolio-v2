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
        "border-border bg-background text-foreground rounded-lg border p-2 [--rdp-accent-color:var(--color-accent)] [--rdp-background-color:var(--color-background)]",
        className,
      )}
    />
  );
}
