import { getLocale, type Language } from "@/lib/i18n";

/** Formats an integer Kama amount with locale-aware digit grouping. */
export function formatKamas(value: number, language: Language = "en") {
  return new Intl.NumberFormat(getLocale(language), {
    maximumFractionDigits: 0,
  }).format(value);
}

/** Formats an ISO date for display, preserving date-only values in local time. */
export function formatDate(date: string | null, language: Language = "en") {
  if (!date) return "-";
  return new Intl.DateTimeFormat(getLocale(language), {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

/** Converts a date to the `YYYY-MM-DD` representation expected by date inputs. */
export function toDateInputValue(date = new Date()) {
  return date.toISOString().slice(0, 10);
}