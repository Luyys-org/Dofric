import { readFile, writeFile } from "node:fs/promises";

const sourcePath = new URL("../public/MAPPED_ITEMS.json", import.meta.url);
const targetPath = new URL("../public/items.json", import.meta.url);
const archimonsterSoulsPath = new URL("../public/archimonster-souls.json", import.meta.url);

const items = JSON.parse(await readFile(sourcePath, "utf8"));
const toCatalogItem = (item) => {
  const englishName = item?.name?.en;
  const frenchName = item?.name?.fr;
  const english = typeof englishName === "string" ? englishName.trim() : "";
  const french = typeof frenchName === "string" ? frenchName.trim() : english;
  return typeof item?.ankama_id === "number" && english
    ? { id: item.ankama_id, names: { en: english, fr: french } }
    : null;
};

const index = items
  .map(toCatalogItem)
  .filter(Boolean)
  .sort((first, second) => first.names.en.localeCompare(second.names.en));
const archimonsterSouls = items
  .filter((item) => item?.type?.name?.en === "Archmonster Soul")
  .map(toCatalogItem)
  .filter(Boolean)
  .sort((first, second) => first.names.en.localeCompare(second.names.en));

await Promise.all([
  writeFile(targetPath, JSON.stringify(index)),
  writeFile(archimonsterSoulsPath, JSON.stringify(archimonsterSouls)),
]);
console.log(`Generated ${index.length} bilingual item names and ${archimonsterSouls.length} Archmonster souls.`);