export const COMMERCIAL_TYPES = ["buy-resell", "crafting", "shattering", "archimonster-sell", "magus"] as const;

export type CommercialType = (typeof COMMERCIAL_TYPES)[number];

export type SaleStatus = "NOT_SOLD" | "PARTIALLY_SOLD" | "SOLD";

export type RuneSaleStatus = Exclude<SaleStatus, "PARTIALLY_SOLD">;

export interface CommercialTypeDetails {
  label: string;
  description: string;
}

export const COMMERCIAL_TYPE_DETAILS: Record<
  CommercialType,
  CommercialTypeDetails
> = {
  "buy-resell": {
    label: "Buy / Resell",
    description: "Trade items for a higher market price.",
  },
  crafting: {
    label: "Crafting",
    description: "Turn raw materials into a finished item.",
  },
  shattering: {
    label: "Shattering",
    description: "Shatter equipment into runes for resale.",
  },
  "archimonster-sell": {
    label: "Archmonster sell",
    description: "Track farming costs and sell Archmonster souls.",
  },
  magus: {
    label: "Magus",
    description: "Sell enchanted or improved equipment.",
  },
};

export interface TradeEntry {
  id: string;
  commercialType: CommercialType;
  itemName: string;
  quantity: number;
  entryCost: number;
  acquiredAt: string;
  status: SaleStatus;
  sellPrice: number | null;
  soldAt: string | null;
  runes?: ShatteringRune[];
  archimonsterSouls?: ArchimonsterSoul[];
  forcedSold?: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShatteringRune {
  id: string;
  name: string;
  quantity: number;
  status: RuneSaleStatus;
  sellPrice: number | null;
  soldAt: string | null;
}

export interface ArchimonsterSoul {
  id: string;
  name: string;
  quantity: number;
  status: RuneSaleStatus;
  sellPrice: number | null;
  soldAt: string | null;
}

export interface KamaTrackerState {
  entries: TradeEntry[];
}

export interface CreateTradeInput {
  commercialType: CommercialType;
  itemName: string;
  entryCost: number;
  quantity?: number;
  acquiredAt?: string;
  notes?: string;
}

export interface CompleteSaleInput {
  sellPrice: number;
  soldAt?: string;
}

export interface AddShatteringRuneInput {
  name: string;
  quantity?: number;
}

export interface CompleteRuneSaleInput {
  sellPrice: number;
  soldAt?: string;
}

export interface AddArchimonsterSoulInput {
  name: string;
  quantity?: number;
}

export interface CompleteArchimonsterSoulSaleInput {
  sellPrice: number;
  soldAt?: string;
}

export interface UpdateTradeInput {
  itemName: string;
  entryCost: number;
  quantity: number;
  acquiredAt: string;
  notes: string;
}