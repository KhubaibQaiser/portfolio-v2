import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function formatDateRange(start: string, end: string | null): string {
  const startFormatted = formatDate(start);
  const endFormatted = end ? formatDate(end) : "Present";
  return `${startFormatted} – ${endFormatted}`;
}
