import { createBrowserStorage } from "@/lib/storage";
import type {
  CompleteSaleInput,
  CreateTradeInput,
  KamaTrackerState,
  TradeEntry,
  UpdateTradeInput,
} from "@/types/kama-tracker";

export const INITIAL_TRACKER_STATE: KamaTrackerState = { entries: [] };

export const trackerStorage = createBrowserStorage<KamaTrackerState>(
  "dofric:kama-tracker",
  INITIAL_TRACKER_STATE,
);

function now() {
  return new Date().toISOString();
}

function today() {
  return now().slice(0, 10);
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function updateEntry(
  state: KamaTrackerState,
  entryId: string,
  update: (entry: TradeEntry) => TradeEntry,
) {
  return {
    ...state,
    entries: state.entries.map((entry) =>
      entry.id === entryId ? update(entry) : entry,
    ),
  };
}

/** Adds a new pending trade with its entry cost and no recorded sale. */
export function addTrade(input: CreateTradeInput) {
  const timestamp = now();
  const entry: TradeEntry = {
    id: createId(),
    commercialType: input.commercialType,
    itemName: input.itemName.trim(),
    quantity: input.quantity ?? 1,
    entryCost: input.entryCost,
    acquiredAt: input.acquiredAt ?? today(),
    status: "NOT_SOLD",
    sellPrice: null,
    soldAt: null,
    notes: input.notes?.trim() ?? "",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  trackerStorage.set((state) => ({
    ...state,
    entries: [entry, ...state.entries],
  }));
}

/** Records a trade's sell price and marks the entry as sold. */
export function completeSale(entryId: string, input: CompleteSaleInput) {
  trackerStorage.set((state) =>
    updateEntry(state, entryId, (entry) => ({
      ...entry,
      status: "SOLD",
      sellPrice: input.sellPrice,
      soldAt: input.soldAt ?? today(),
      updatedAt: now(),
    })),
  );
}

/** Replaces the editable entry details while retaining its sale state. */
export function updateTrade(entryId: string, input: UpdateTradeInput) {
  trackerStorage.set((state) =>
    updateEntry(state, entryId, (entry) => ({
      ...entry,
      itemName: input.itemName.trim(),
      entryCost: input.entryCost,
      quantity: input.quantity,
      acquiredAt: input.acquiredAt,
      notes: input.notes.trim(),
      updatedAt: now(),
    })),
  );
}

/** Permanently removes a trade entry from the locally persisted tracker. */
export function deleteTrade(entryId: string) {
  trackerStorage.set((state) => ({
    ...state,
    entries: state.entries.filter((entry) => entry.id !== entryId),
  }));
}