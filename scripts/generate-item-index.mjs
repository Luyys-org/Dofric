import { readFile, writeFile } from "node:fs/promises";

const sourcePath = new URL("../public/MAPPED_ITEMS.json", import.meta.url);
const targetPath = new URL("../public/items.en.json", import.meta.url);

const items = JSON.parse(await readFile(sourcePath, "utf8"));
const index = items
  .flatMap((item) => {
    const englishName = item?.name?.en;
    const name = typeof englishName === "string" ? englishName.trim() : "";
    return typeof item?.ankama_id === "number" && name
      ? [{ id: item.ankama_id, name }]
      : [];
  })
  .sort((first, second) => first.name.localeCompare(second.name));

await writeFile(targetPath, JSON.stringify(index));
console.log(`Generated ${index.length} item names in public/items.en.json.`);