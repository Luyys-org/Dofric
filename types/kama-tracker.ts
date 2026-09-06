export const COMMERCIAL_TYPES = ["buy-resell", "crafting", "magus"] as const;

export type CommercialType = (typeof COMMERCIAL_TYPES)[number];

export type SaleStatus = "NOT_SOLD" | "SOLD";

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
  notes: string;
  createdAt: string;
  updatedAt: string;
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

export interface UpdateTradeInput {
  itemName: string;
  entryCost: number;
  quantity: number;
  acquiredAt: string;
  notes: string;
}