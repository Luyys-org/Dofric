import type {
  CommercialType,
  KamaTrackerState,
  TradeEntry,
} from "@/types/kama-tracker";

export type Timeline = "7d" | "30d" | "90d" | "all";

export interface CommercialTotals {
  expenses: number;
  sales: number;
  profit: number;
  entryCount: number;
  soldCount: number;
}

const TIMELINE_DAYS: Record<Exclude<Timeline, "all">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export function getEntryProfit(entry: TradeEntry) {
  return entry.sellPrice === null ? null : entry.sellPrice - entry.entryCost;
}

export function isInTimeline(date: string | null, timeline: Timeline) {
  if (!date || timeline === "all") return Boolean(date);

  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - TIMELINE_DAYS[timeline] + 1);

  return new Date(date) >= cutoff;
}

export function getCommercialTotals(
  state: KamaTrackerState,
  commercialType: CommercialType,
  timeline: Timeline = "all",
): CommercialTotals {
  const entries = state.entries.filter(
    (entry) => entry.commercialType === commercialType,
  );
  const expenseEntries = entries.filter((entry) =>
    isInTimeline(entry.acquiredAt, timeline),
  );
  const saleEntries = entries.filter((entry) =>
    isInTimeline(entry.soldAt, timeline),
  );
  const expenses = expenseEntries.reduce(
    (sum, entry) => sum + entry.entryCost,
    0,
  );
  const sales = saleEntries.reduce(
    (sum, entry) => sum + (entry.sellPrice ?? 0),
    0,
  );

  return {
    expenses,
    sales,
    profit: sales - expenses,
    entryCount: expenseEntries.length,
    soldCount: saleEntries.length,
  };
}

export function getTrackerTotals(
  state: KamaTrackerState,
  timeline: Timeline = "all",
) {
  const expenseEntries = state.entries.filter((entry) =>
    isInTimeline(entry.acquiredAt, timeline),
  );
  const saleEntries = state.entries.filter((entry) =>
    isInTimeline(entry.soldAt, timeline),
  );
  const expenses = expenseEntries.reduce(
    (sum, entry) => sum + entry.entryCost,
    0,
  );
  const sales = saleEntries.reduce(
    (sum, entry) => sum + (entry.sellPrice ?? 0),
    0,
  );

  return {
    expenses,
    sales,
    profit: sales - expenses,
    openCount: expenseEntries.filter((entry) => entry.status === "NOT_SOLD").length,
  };
}

export function getLatestEntries(
  state: KamaTrackerState,
  commercialType: CommercialType,
  limit = 4,
) {
  return state.entries
    .filter((entry) => entry.commercialType === commercialType)
    .toSorted((first, second) => second.updatedAt.localeCompare(first.updatedAt))
    .slice(0, limit);
}