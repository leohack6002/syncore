import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind class names while resolving conflicting utility classes.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats an ISO date into a compact relative label for inbox rows.
 */
export function formatRelativeTime(date: string) {
  const then = new Date(date).getTime();
  const diff = Date.now() - then;
  const minute = 60_000;
  const hour = minute * 60;
  const day = hour * 24;

  if (diff < hour) return `${Math.max(1, Math.round(diff / minute))}m`;
  if (diff < day) return `${Math.round(diff / hour)}h`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(date));
}

/**
 * Formats an ISO date into the user's full local date and time string.
 */
export function formatFullDateTime(date: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(date));
}
