import {
  COMMERCIAL_TYPE_DETAILS,
  COMMERCIAL_TYPES,
  type CommercialType,
} from "@/types/kama-tracker";

/** Converts a route slug into a supported commercial type, or `null` when invalid. */
export function getCommercialType(slug: string): CommercialType | null {
  return COMMERCIAL_TYPES.find((commercialType) => commercialType === slug) ?? null;
}

/** Returns display metadata for a supported commercial route slug. */
export function getCommercialTypeDetails(slug: string) {
  const commercialType = getCommercialType(slug);
  return commercialType ? COMMERCIAL_TYPE_DETAILS[commercialType] : null;
}