"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import * as Popover from "@radix-ui/react-popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { parseExperienceDateString } from "@portfolio/shared/experience-dates";
import { cn } from "@portfolio/shared/utils";
import { Calendar } from "./calendar";
import { Button } from "./button";

export type MonthYearPickerProps = {
  id?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  /** When true, show control to clear value (e.g. end date → Present). */
  clearable?: boolean;
  disabled?: boolean;
};

export function MonthYearPicker({
  id,
  value,
  onChange,
  placeholder = "Select month",
  clearable = false,
  disabled = false,
}: MonthYearPickerProps) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => {
    if (value == null || !String(value).trim()) return undefined;
    const d = parseExperienceDateString(value);
    return d.getTime() === 0 ? undefined : d;
  }, [value]);

  const label = value?.trim() ? value : placeholder;

  return (
    <div className="flex flex-col gap-1.5">
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <Button
            type="button"
            variant="outline"
            id={id}
            disabled={disabled}
            className={cn(
              "h-10 w-full justify-start text-left font-normal",
              !value?.trim() && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" aria-hidden />
            {label}
          </Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="z-100 rounded-xl border border-border bg-background p-0 shadow-lg outline-hidden"
            sideOffset={6}
            align="start"
          >
            <Calendar
              mode="single"
              selected={selected}
              onSelect={(d) => {
                if (d) {
                  onChange(format(d, "MMM yyyy"));
                  setOpen(false);
                }
              }}
              defaultMonth={selected ?? new Date()}
              captionLayout="dropdown"
              startMonth={new Date(1980, 0)}
              endMonth={new Date(new Date().getFullYear() + 3, 11)}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {clearable && value != null && String(value).trim() !== "" && (
        <button
          type="button"
          className="text-left text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          onClick={() => onChange(null)}
        >
          Clear — role ended (show &quot;Present&quot; on site when empty)
        </button>
      )}
    </div>
  );
}
