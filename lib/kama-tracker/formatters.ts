export function formatKamas(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date: string | null) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

export function toDateInputValue(date = new Date()) {
  return date.toISOString().slice(0, 10);
}