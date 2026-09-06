import {
  COMMERCIAL_TYPE_DETAILS,
  COMMERCIAL_TYPES,
  type CommercialType,
} from "@/types/kama-tracker";

export function getCommercialType(slug: string): CommercialType | null {
  return COMMERCIAL_TYPES.find((commercialType) => commercialType === slug) ?? null;
}

export function getCommercialTypeDetails(slug: string) {
  const commercialType = getCommercialType(slug);
  return commercialType ? COMMERCIAL_TYPE_DETAILS[commercialType] : null;
}