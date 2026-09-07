import { createBrowserStorage } from "@/lib/storage";
import type {
  AddArchimonsterSoulInput,
  AddShatteringRuneInput,
  ArchimonsterSoul,
  CompleteArchimonsterSoulSaleInput,
  CompleteRuneSaleInput,
  CompleteSaleInput,
  CreateTradeInput,
  KamaTrackerState,
  SaleStatus,
  ShatteringRune,
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

function getShatteringStatus(entry: TradeEntry, runes: ShatteringRune[]): SaleStatus {
  if (entry.forcedSold || runes.length === 0) return entry.forcedSold ? "SOLD" : "NOT_SOLD";
  if (runes.every((rune) => rune.status === "SOLD")) return "SOLD";
  return runes.some((rune) => rune.status === "SOLD") ? "PARTIALLY_SOLD" : "NOT_SOLD";
}

function synchronizeShatteringSale(entry: TradeEntry, runes: ShatteringRune[]): TradeEntry {
  if (entry.forcedSold) return { ...entry, runes };

  const soldRunes = runes.filter((rune) => rune.status === "SOLD");
  return {
    ...entry,
    runes,
    status: getShatteringStatus(entry, runes),
    sellPrice: soldRunes.length > 0 ? soldRunes.reduce((sum, rune) => sum + (rune.sellPrice ?? 0), 0) : null,
    soldAt: soldRunes.reduce<string | null>(
      (latest, rune) => (!latest || (rune.soldAt && rune.soldAt > latest) ? rune.soldAt : latest),
      null,
    ),
    updatedAt: now(),
  };
}

function getArchimonsterSaleStatus(souls: ArchimonsterSoul[]): SaleStatus {
  if (souls.length === 0) return "NOT_SOLD";
  if (souls.every((soul) => soul.status === "SOLD")) return "SOLD";
  return souls.some((soul) => soul.status === "SOLD") ? "PARTIALLY_SOLD" : "NOT_SOLD";
}

function synchronizeArchimonsterSale(entry: TradeEntry, souls: ArchimonsterSoul[]): TradeEntry {
  const soldSouls = souls.filter((soul) => soul.status === "SOLD");
  return {
    ...entry,
    archimonsterSouls: souls,
    status: getArchimonsterSaleStatus(souls),
    sellPrice: soldSouls.length > 0 ? soldSouls.reduce((sum, soul) => sum + (soul.sellPrice ?? 0), 0) : null,
    soldAt: soldSouls.reduce<string | null>(
      (latest, soul) => (!latest || (soul.soldAt && soul.soldAt > latest) ? soul.soldAt : latest),
      null,
    ),
    updatedAt: now(),
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
      forcedSold: entry.commercialType === "shattering" ? true : entry.forcedSold,
      updatedAt: now(),
    })),
  );
}

/** Adds a rune produced by a shattering entry. */
export function addShatteringRune(entryId: string, input: AddShatteringRuneInput) {
  const name = input.name.trim();
  const quantity = input.quantity ?? 1;
  if (!name || quantity <= 0) return;

  trackerStorage.set((state) =>
    updateEntry(state, entryId, (entry) => {
      if (entry.commercialType !== "shattering") return entry;
      const rune: ShatteringRune = {
        id: createId(),
        name,
        quantity,
        status: "NOT_SOLD",
        sellPrice: null,
        soldAt: null,
      };
      return synchronizeShatteringSale(entry, [...(entry.runes ?? []), rune]);
    }),
  );
}

/** Records the sale of one rune produced by a shattering entry. */
export function completeRuneSale(
  entryId: string,
  runeId: string,
  input: CompleteRuneSaleInput,
) {
  trackerStorage.set((state) =>
    updateEntry(state, entryId, (entry) => {
      if (entry.commercialType !== "shattering" || entry.forcedSold) return entry;
      const runes = (entry.runes ?? []).map((rune) =>
        rune.id === runeId
          ? { ...rune, status: "SOLD" as const, sellPrice: input.sellPrice, soldAt: input.soldAt ?? today() }
          : rune,
      );
      return synchronizeShatteringSale(entry, runes);
    }),
  );
}

/** Reopens a rune sale so its price and date no longer contribute to the entry total. */
export function reopenRuneSale(entryId: string, runeId: string) {
  trackerStorage.set((state) =>
    updateEntry(state, entryId, (entry) => {
      if (entry.commercialType !== "shattering" || entry.forcedSold) return entry;
      const runes = (entry.runes ?? []).map((rune) =>
        rune.id === runeId
          ? { ...rune, status: "NOT_SOLD" as const, sellPrice: null, soldAt: null }
          : rune,
      );
      return synchronizeShatteringSale(entry, runes);
    }),
  );
}

/** Removes a rune from a shattering entry. */
export function deleteShatteringRune(entryId: string, runeId: string) {
  trackerStorage.set((state) =>
    updateEntry(state, entryId, (entry) => {
      if (entry.commercialType !== "shattering" || entry.forcedSold) return entry;
      const runes = (entry.runes ?? []).filter((rune) => rune.id !== runeId);
      return synchronizeShatteringSale(entry, runes);
    }),
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

/** Adds an Archmonster soul found during a farming session. */
export function addArchimonsterSoul(entryId: string, input: AddArchimonsterSoulInput) {
  const name = input.name.trim();
  const quantity = input.quantity ?? 1;
  if (!name || quantity <= 0) return;

  trackerStorage.set((state) =>
    updateEntry(state, entryId, (entry) => {
      if (entry.commercialType !== "archimonster-sell") return entry;
      const soul: ArchimonsterSoul = {
        id: createId(),
        name,
        quantity,
        status: "NOT_SOLD",
        sellPrice: null,
        soldAt: null,
      };
      return synchronizeArchimonsterSale(entry, [...(entry.archimonsterSouls ?? []), soul]);
    }),
  );
}

/** Records the sale of an Archmonster soul from a farming session. */
export function completeArchimonsterSoulSale(
  entryId: string,
  soulId: string,
  input: CompleteArchimonsterSoulSaleInput,
) {
  trackerStorage.set((state) =>
    updateEntry(state, entryId, (entry) => {
      if (entry.commercialType !== "archimonster-sell") return entry;
      const souls = (entry.archimonsterSouls ?? []).map((soul) =>
        soul.id === soulId
          ? { ...soul, status: "SOLD" as const, sellPrice: input.sellPrice, soldAt: input.soldAt ?? today() }
          : soul,
      );
      return synchronizeArchimonsterSale(entry, souls);
    }),
  );
}

/** Reopens an Archmonster soul sale so it no longer contributes to the session total. */
export function reopenArchimonsterSoulSale(entryId: string, soulId: string) {
  trackerStorage.set((state) =>
    updateEntry(state, entryId, (entry) => {
      if (entry.commercialType !== "archimonster-sell") return entry;
      const souls = (entry.archimonsterSouls ?? []).map((soul) =>
        soul.id === soulId
          ? { ...soul, status: "NOT_SOLD" as const, sellPrice: null, soldAt: null }
          : soul,
      );
      return synchronizeArchimonsterSale(entry, souls);
    }),
  );
}

/** Removes an Archmonster soul from a farming session. */
export function deleteArchimonsterSoul(entryId: string, soulId: string) {
  trackerStorage.set((state) =>
    updateEntry(state, entryId, (entry) => {
      if (entry.commercialType !== "archimonster-sell") return entry;
      return synchronizeArchimonsterSale(
        entry,
        (entry.archimonsterSouls ?? []).filter((soul) => soul.id !== soulId),
      );
    }),
  );
}