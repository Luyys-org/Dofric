import { readFile, writeFile } from "node:fs/promises";

const sourcePath = new URL("../public/MAPPED_ITEMS.json", import.meta.url);
const targetPath = new URL("../public/items.json", import.meta.url);

const items = JSON.parse(await readFile(sourcePath, "utf8"));
const index = items
  .flatMap((item) => {
    const englishName = item?.name?.en;
    const frenchName = item?.name?.fr;
    const english = typeof englishName === "string" ? englishName.trim() : "";
    const french = typeof frenchName === "string" ? frenchName.trim() : english;
    return typeof item?.ankama_id === "number" && english
      ? [{ id: item.ankama_id, names: { en: english, fr: french } }]
      : [];
  })
  .sort((first, second) => first.names.en.localeCompare(second.names.en));

await writeFile(targetPath, JSON.stringify(index));
console.log(`Generated ${index.length} bilingual item names in public/items.json.`);