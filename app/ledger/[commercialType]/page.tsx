import { notFound } from "next/navigation";

import { Ledger } from "@/app/components/ledger/ledger";
import { getCommercialType } from "@/lib/kama-tracker/commercial-route";
import { COMMERCIAL_TYPES } from "@/types/kama-tracker";

export const dynamicParams = false;

export function generateStaticParams() {
  return COMMERCIAL_TYPES.map((commercialType) => ({ commercialType }));
}

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