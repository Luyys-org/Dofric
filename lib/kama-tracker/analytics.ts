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

interface SaleRecord {
  price: number;
  soldAt: string;
}

const TIMELINE_DAYS: Record<Exclude<Timeline, "all">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

/** Returns an entry's realized profit to date, or `null` while no sale is recorded. */
export function getEntryProfit(entry: TradeEntry) {
  return entry.sellPrice === null ? null : entry.sellPrice - entry.entryCost;
}

/** Returns all recorded sale amounts and dates, including individually sold runes and souls. */
export function getEntrySaleRecords(entry: TradeEntry): SaleRecord[] {
  if (entry.commercialType === "shattering" && !entry.forcedSold) {
    return (entry.runes ?? []).flatMap((rune) =>
      rune.status === "SOLD" && rune.sellPrice !== null && rune.soldAt
        ? [{ price: rune.sellPrice, soldAt: rune.soldAt }]
        : [],
    );
  }

  if (entry.commercialType === "archimonster-sell") {
    return (entry.archimonsterSouls ?? []).flatMap((soul) =>
      soul.status === "SOLD" && soul.sellPrice !== null && soul.soldAt
        ? [{ price: soul.sellPrice, soldAt: soul.soldAt }]
        : [],
    );
  }

  return entry.sellPrice !== null && entry.soldAt
    ? [{ price: entry.sellPrice, soldAt: entry.soldAt }]
    : [];
}

/** Checks whether a non-null date falls within the requested reporting timeline. */
export function isInTimeline(date: string | null, timeline: Timeline) {
  if (!date || timeline === "all") return Boolean(date);

  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - TIMELINE_DAYS[timeline] + 1);

  return new Date(date) >= cutoff;
}

/** Calculates sales, expenses, and counts for one commercial type and timeline. */
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
  const saleRecords = entries.flatMap(getEntrySaleRecords).filter((sale) =>
    isInTimeline(sale.soldAt, timeline),
  );
  const expenses = expenseEntries.reduce(
    (sum, entry) => sum + entry.entryCost,
    0,
  );
  const sales = saleRecords.reduce(
    (sum, sale) => sum + sale.price,
    0,
  );

  return {
    expenses,
    sales,
    profit: sales - expenses,
    entryCount: expenseEntries.length,
    soldCount: saleRecords.length,
  };
}

/** Calculates tracker-wide sales, expenses, realized balance, and open listings. */
export function getTrackerTotals(
  state: KamaTrackerState,
  timeline: Timeline = "all",
) {
  const expenseEntries = state.entries.filter((entry) =>
    isInTimeline(entry.acquiredAt, timeline),
  );
  const saleRecords = state.entries.flatMap(getEntrySaleRecords).filter((sale) =>
    isInTimeline(sale.soldAt, timeline),
  );
  const expenses = expenseEntries.reduce(
    (sum, entry) => sum + entry.entryCost,
    0,
  );
  const sales = saleRecords.reduce(
    (sum, sale) => sum + sale.price,
    0,
  );

  return {
    expenses,
    sales,
    profit: sales - expenses,
    openCount: expenseEntries.filter((entry) => entry.status !== "SOLD").length,
  };
}

/** Returns the most recently changed entries for a commercial type. */
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