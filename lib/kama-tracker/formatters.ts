/** Formats an integer Kama amount with locale-aware digit grouping. */
export function formatKamas(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

/** Formats an ISO date for display, preserving date-only values in local time. */
export function formatDate(date: string | null) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

/** Converts a date to the `YYYY-MM-DD` representation expected by date inputs. */
export function toDateInputValue(date = new Date()) {
  return date.toISOString().slice(0, 10);
}