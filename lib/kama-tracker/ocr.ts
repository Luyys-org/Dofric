/** Extracts every price immediately followed by `kama` or `kamas` from OCR text. */
export function extractKamaValues(text: string) {
  const matches = text.matchAll(/(?:\(|\[|\s)(\d[\d\s.,]*?)\s*kamas?\b/gi);

  return Array.from(matches, (match) => {
    const value = Number(match[1].replace(/[^\d]/g, ""));
    return Number.isSafeInteger(value) ? value : null;
  }).filter((value): value is number => value !== null);
}

/** Totals the OCR values whose matching selection flag is enabled. */
export function sumKamaValues(values: number[], selected: boolean[]) {
  return values.reduce(
    (total, value, index) => total + (selected[index] ? value : 0),
    0,
  );
}