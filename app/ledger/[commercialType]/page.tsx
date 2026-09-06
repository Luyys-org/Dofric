import { notFound } from "next/navigation";

import { Ledger } from "@/app/components/ledger/ledger";
import { getCommercialType } from "@/lib/kama-tracker/commercial-route";
import { COMMERCIAL_TYPES } from "@/types/kama-tracker";

export const dynamicParams = false;

/** Lists the supported commercial-type route parameters for static generation. */
export function generateStaticParams() {
  return COMMERCIAL_TYPES.map((commercialType) => ({ commercialType }));
}

/** Resolves a commercial route parameter and renders its corresponding ledger. */
export default async function CommercialLedgerPage({
  params,
}: {
  params: Promise<{ commercialType: string }>;
}) {
  const { commercialType: slug } = await params;
  const commercialType = getCommercialType(slug);

  if (!commercialType) notFound();

  return <Ledger commercialType={commercialType} />;
}