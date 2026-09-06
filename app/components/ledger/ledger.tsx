"use client";

import {
  Check,
  CirclePlus,
  LoaderCircle,
  ListPlus,
  Pencil,
  Search,
  Trash2,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";

import { commercialTextKeys, type Language, type TranslationKey } from "@/lib/i18n";
import { getEntryProfit } from "@/lib/kama-tracker/analytics";
import { formatDate, formatKamas, toDateInputValue } from "@/lib/kama-tracker/formatters";
import { extractKamaValues, sumKamaValues } from "@/lib/kama-tracker/ocr";
import { useTracker } from "@/lib/kama-tracker/use-tracker";
import { useLanguage } from "@/app/components/language-provider";
import {
  type CommercialType,
  type SaleStatus,
  type ShatteringRune,
  type TradeEntry,
} from "@/types/kama-tracker";

type SortKey = "acquiredAt-desc" | "acquiredAt-asc" | "itemName-asc" | "entryCost-desc" | "sellPrice-desc" | "profit-desc" | "status-asc";

const sortOptions: { value: SortKey; label: TranslationKey }[] = [
  { value: "acquiredAt-desc", label: "ledger.newestFirst" },
  { value: "acquiredAt-asc", label: "ledger.oldestFirst" },
  { value: "itemName-asc", label: "ledger.itemNameSort" },
  { value: "entryCost-desc", label: "ledger.highestCost" },
  { value: "sellPrice-desc", label: "ledger.highestSale" },
  { value: "profit-desc", label: "ledger.highestProfit" },
  { value: "status-asc", label: "ledger.statusSort" },
];

const tesseractAssetPath = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/tesseract`;
const itemCatalogPath = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/items.json`;

interface DofusItemOption {
  id: number;
  names: Record<Language, string>;
}

let itemCatalogPromise: Promise<DofusItemOption[]> | null = null;

function loadItemCatalog() {
  itemCatalogPromise ??= fetch(itemCatalogPath)
    .then(async (response) => {
      if (!response.ok) throw new Error("Unable to load the item catalog.");
      const catalog: unknown = await response.json();
      if (!Array.isArray(catalog)) throw new Error("Invalid item catalog.");
      return catalog.flatMap((item): DofusItemOption[] => {
        if (
          typeof item !== "object" ||
          item === null ||
          typeof (item as { id?: unknown }).id !== "number" ||
          typeof (item as { names?: { en?: unknown } }).names?.en !== "string" ||
          typeof (item as { names?: { fr?: unknown } }).names?.fr !== "string"
        ) return [];
        return [item as DofusItemOption];
      });
    })
    .catch((error: unknown) => {
      itemCatalogPromise = null;
      throw error;
    });
  return itemCatalogPromise;
}

function getNumber(formData: FormData, field: string) {
  return Number(formData.get(field));
}

function Dialog({
  children,
  description,
  onClose,
  title,
}: {
  children: ReactNode;
  description: string;
  onClose: () => void;
  title: string;
}) {
  const { t } = useLanguage();

  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <dialog
        aria-labelledby="dialog-title"
        aria-modal="true"
        className="dialog"
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
        onMouseDown={(event) => event.stopPropagation()}
        open
      >
        <div className="dialog-header">
          <div>
            <h2 id="dialog-title">{title}</h2>
            <p>{description}</p>
          </div>
          <button className="icon-button" onClick={onClose} title={t("dialog.close")} type="button">
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        {children}
      </dialog>
    </div>
  );
}

function TradeForm({
  commercialType,
  entry,
  onClose,
}: {
  commercialType: CommercialType;
  entry?: TradeEntry;
  onClose: () => void;
}) {
  const { addTrade, updateTrade } = useTracker();
  const { language, t } = useLanguage();
  const editing = Boolean(entry);
  const [itemName, setItemName] = useState(entry?.itemName ?? "");
  const [itemCatalog, setItemCatalog] = useState<DofusItemOption[]>([]);
  const [itemCatalogState, setItemCatalogState] = useState<"loading" | "ready" | "error">("loading");
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [entryCost, setEntryCost] = useState(entry?.entryCost.toString() ?? "");
  const [ocrValues, setOcrValues] = useState<number[]>([]);
  const [selectedOcrValues, setSelectedOcrValues] = useState<boolean[]>([]);
  const [ocrState, setOcrState] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    let active = true;
    loadItemCatalog()
      .then((catalog) => {
        if (!active) return;
        setItemCatalog(catalog);
        setItemCatalogState("ready");
      })
      .catch(() => {
        if (active) setItemCatalogState("error");
      });
    return () => {
      active = false;
    };
  }, []);

  const normalizedItemName = itemName.trim().toLocaleLowerCase();
  const itemSuggestions = normalizedItemName
    ? itemCatalog
        .filter((item) => item.names[language].toLocaleLowerCase().includes(normalizedItemName))
        .slice(0, 50)
    : [];

  async function scanScreenshot(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setOcrState("loading");
    setOcrValues([]);
    setSelectedOcrValues([]);
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", undefined, {
        workerPath: `${tesseractAssetPath}/worker.min.js`,
        corePath: `${tesseractAssetPath}/tesseract-core.wasm.js`,
        langPath: tesseractAssetPath,
      });
      const result = await worker.recognize(file);
      await worker.terminate();
      const values = extractKamaValues(result.data.text);
      setOcrValues(values);
      const selected = values.map(() => true);
      setSelectedOcrValues(selected);
      setEntryCost(sumKamaValues(values, selected).toString());
      setOcrState("idle");
    } catch {
      setOcrState("error");
    } finally {
      event.target.value = "";
    }
  }

  function toggleOcrValue(index: number) {
    const next = selectedOcrValues.map((selected, valueIndex) =>
      valueIndex === index ? !selected : selected,
    );
    setSelectedOcrValues(next);
    setEntryCost(sumKamaValues(ocrValues, next).toString());
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("itemName") ?? "").trim();
    const cost = getNumber(formData, "entryCost");
    const quantity = getNumber(formData, "quantity");

    if (!name || cost < 0 || quantity <= 0) return;

    const input = {
      itemName: name,
      entryCost: cost,
      quantity,
      acquiredAt: String(formData.get("acquiredAt")),
      notes: String(formData.get("notes") ?? ""),
    };
    if (entry) updateTrade(entry.id, input);
    else addTrade({ commercialType, ...input });
    onClose();
  }

  return (
    <Dialog
      description={editing ? t("form.editEntryDescription") : t("form.newEntryDescription")}
      onClose={onClose}
      title={editing ? t("entry.edit") : t("ledger.newEntry")}
    >
      <form className="dialog-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-field full">
            <label htmlFor="itemName">{t("form.itemName")}</label>
            <div className="item-picker">
              <input aria-autocomplete="list" aria-controls="dofus-item-options" aria-expanded={itemPickerOpen && itemSuggestions.length > 0} autoComplete="off" className="field-control" disabled={itemCatalogState === "loading"} id="itemName" name="itemName" onBlur={() => setItemPickerOpen(false)} onChange={(event) => { setItemName(event.target.value); setItemPickerOpen(true); }} onFocus={() => setItemPickerOpen(true)} onKeyDown={(event) => { if (event.key === "Escape") setItemPickerOpen(false); }} placeholder={itemCatalogState === "loading" ? t("form.loadingItems") : t("form.searchItems")} required role="combobox" value={itemName} />
              {itemPickerOpen && itemSuggestions.length > 0 && <ul className="item-suggestions" id="dofus-item-options" role="listbox">{itemSuggestions.map((item) => <li key={item.id}><button aria-selected={itemName === item.names[language]} onMouseDown={(event) => event.preventDefault()} onClick={() => { setItemName(item.names[language]); setItemPickerOpen(false); }} role="option" type="button">{item.names[language]}</button></li>)}</ul>}
            </div>
            {itemCatalogState === "error" && <p className="item-catalog-error" role="alert">{t("form.itemLoadError")}</p>}
          </div>
          <div className="form-field">
            <label htmlFor="entryCost">{t("form.entryCost")}</label>
            <input className="field-control" id="entryCost" min="0" name="entryCost" onChange={(event) => setEntryCost(event.target.value)} required step="1" type="number" value={entryCost} />
            <div className="ocr-control">
              <label className="upload-button">
                {ocrState === "loading" ? <LoaderCircle aria-hidden="true" className="is-spinning" size={15} /> : <Upload aria-hidden="true" size={15} />}
                {ocrState === "loading" ? t("form.readingScreenshot") : t("form.scanScreenshot")}
                <input accept="image/png,image/jpeg,image/webp" disabled={ocrState === "loading"} onChange={scanScreenshot} type="file" />
              </label>
              <span>{t("form.ocrHint")}</span>
            </div>
            {ocrState === "error" && <p className="ocr-error" role="alert">{t("form.ocrError")}</p>}
            {ocrValues.length > 0 && <div className="ocr-results"><div><strong>{t("form.pricesFound", { count: ocrValues.length })}</strong><span>{t("form.kamasSelected", { value: formatKamas(sumKamaValues(ocrValues, selectedOcrValues), language) })}</span></div><ul>{ocrValues.map((value, index) => <li key={`${value}-${index}`}><label><input checked={selectedOcrValues[index]} onChange={() => toggleOcrValue(index)} type="checkbox" /><span>{formatKamas(value, language)} {t("dashboard.kamas")}</span></label></li>)}</ul></div>}
          </div>
          <div className="form-field" style={{ alignContent: "start", gridTemplateRows: "max-content max-content" }}>
            <label htmlFor="quantity">{t("form.quantity")}</label>
            <input className="field-control" defaultValue={entry?.quantity ?? 1} id="quantity" min="1" name="quantity" required step="1" style={{ alignSelf: "start", height: 38 }} type="number" />
          </div>
          <div className="form-field full">
            <label htmlFor="acquiredAt">{t("ledger.entryDate")}</label>
            <input className="field-control" defaultValue={entry?.acquiredAt ?? toDateInputValue()} id="acquiredAt" name="acquiredAt" required type="date" />
          </div>
          <div className="form-field full">
            <label htmlFor="notes">{t("form.notes")}</label>
            <textarea className="field-control" defaultValue={entry?.notes} id="notes" name="notes" placeholder={t("form.optionalDetails")} />
          </div>
        </div>
        <div className="dialog-actions">
          <button className="secondary-button" onClick={onClose} type="button">{t("form.cancel")}</button>
          <button className="primary-button" type="submit">{editing ? t("form.saveChanges") : t("form.addEntry")}</button>
        </div>
      </form>
    </Dialog>
  );
}

function SaleForm({ entry, onClose }: { entry: TradeEntry; onClose: () => void }) {
  const { completeSale } = useTracker();
  const { t } = useLanguage();
  const forcingShatteringSale = entry.commercialType === "shattering";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const sellPrice = getNumber(formData, "sellPrice");
    if (sellPrice < 0) return;
    completeSale(entry.id, { sellPrice, soldAt: String(formData.get("soldAt")) });
    onClose();
  }

  return (
    <Dialog
      description={forcingShatteringSale ? t("sale.forceDescription", { name: entry.itemName }) : t("sale.completeFor", { name: entry.itemName })}
      onClose={onClose}
      title={forcingShatteringSale ? t("sale.forceCompleteEntry") : t("sale.recordSale")}
    >
      <form className="dialog-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-field full">
            <label htmlFor="sellPrice">{forcingShatteringSale ? t("sale.totalRuneSales") : t("sale.sellPrice")}</label>
            <input autoFocus className="field-control" id="sellPrice" min="0" name="sellPrice" required step="1" type="number" />
          </div>
          <div className="form-field full">
            <label htmlFor="soldAt">{t("sale.saleDate")}</label>
            <input className="field-control" defaultValue={toDateInputValue()} id="soldAt" name="soldAt" required type="date" />
          </div>
        </div>
        <div className="dialog-actions">
          <button className="secondary-button" onClick={onClose} type="button">{t("form.cancel")}</button>
          <button className="primary-button" type="submit"><Check aria-hidden="true" size={16} />{forcingShatteringSale ? t("sale.forceComplete") : t("sale.completeSale")}</button>
        </div>
      </form>
    </Dialog>
  );
}

function RuneSaleForm({ entry, onClose, rune }: { entry: TradeEntry; onClose: () => void; rune: ShatteringRune }) {
  const { completeRuneSale } = useTracker();
  const { t } = useLanguage();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const sellPrice = getNumber(formData, "sellPrice");
    if (sellPrice < 0) return;
    completeRuneSale(entry.id, rune.id, { sellPrice, soldAt: String(formData.get("soldAt")) });
    onClose();
  }

  return (
    <Dialog description={t("runes.recordDescription", { quantity: rune.quantity, name: rune.name })} onClose={onClose} title={t("runes.recordSale")}>
      <form className="dialog-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-field full">
            <label htmlFor="runeSellPrice">{t("sale.sellPrice")}</label>
            <input autoFocus className="field-control" id="runeSellPrice" min="0" name="sellPrice" required step="1" type="number" />
          </div>
          <div className="form-field full">
            <label htmlFor="runeSoldAt">{t("sale.saleDate")}</label>
            <input className="field-control" defaultValue={toDateInputValue()} id="runeSoldAt" name="soldAt" required type="date" />
          </div>
        </div>
        <div className="dialog-actions">
          <button className="secondary-button" onClick={onClose} type="button">{t("form.cancel")}</button>
          <button className="primary-button" type="submit"><Check aria-hidden="true" size={16} />{t("sale.recordSale")}</button>
        </div>
      </form>
    </Dialog>
  );
}

function RuneManager({
  entry,
  onClose,
  onRecordSale,
}: {
  entry: TradeEntry;
  onClose: () => void;
  onRecordSale: (rune: ShatteringRune) => void;
}) {
  const { addShatteringRune, deleteShatteringRune, reopenRuneSale } = useTracker();
  const { language, t } = useLanguage();
  const runes = entry.runes ?? [];
  const isForced = Boolean(entry.forcedSold);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const quantity = getNumber(formData, "quantity");
    if (!name || quantity <= 0) return;
    addShatteringRune(entry.id, { name, quantity });
    event.currentTarget.reset();
  }

  return (
    <Dialog description={t("runes.description", { name: entry.itemName })} onClose={onClose} title={t("runes.manageTitle")}>
      <div className="rune-manager">
        {isForced && <p className="rune-notice">{t("runes.forcedNotice")}</p>}
        {!isForced && <form className="rune-add-form" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="runeName">{t("runes.name")}</label>
          <input className="field-control" id="runeName" name="name" placeholder={t("runes.name")} required />
          <label className="sr-only" htmlFor="runeQuantity">{t("form.quantity")}</label>
          <input className="field-control" defaultValue="1" id="runeQuantity" min="1" name="quantity" required step="1" type="number" />
          <button className="secondary-button" type="submit"><CirclePlus aria-hidden="true" size={16} />{t("runes.add")}</button>
        </form>}
        {runes.length === 0 ? <div className="empty-runes"><p>{t("runes.none")}</p></div> : <ul className="rune-list">{runes.map((rune) => <li key={rune.id}><div className="rune-detail"><strong>{rune.name}</strong><small>{t("runes.quantity", { count: rune.quantity })}{rune.soldAt && ` · ${t("runes.soldDate", { date: formatDate(rune.soldAt, language) })}`}</small></div><div className="rune-sale"><span className="numeric">{rune.sellPrice === null ? "-" : formatKamas(rune.sellPrice, language)}</span><span className={rune.status === "SOLD" ? "status is-sold" : "status is-open"}>{t(rune.status === "SOLD" ? "status.sold" : "status.notSold")}</span>{!isForced && (rune.status === "SOLD" ? <button className="icon-button" onClick={() => reopenRuneSale(entry.id, rune.id)} title={t("runes.reopen")} type="button"><Undo2 aria-hidden="true" size={16} /></button> : <button className="icon-button" onClick={() => onRecordSale(rune)} title={t("runes.recordSale")} type="button"><Check aria-hidden="true" size={17} /></button>)}{!isForced && <button className="icon-button" onClick={() => deleteShatteringRune(entry.id, rune.id)} title={t("runes.delete")} type="button"><Trash2 aria-hidden="true" size={16} /></button>}</div></li>)}</ul>}
      </div>
    </Dialog>
  );
}

function sortEntries(entries: TradeEntry[], sort: SortKey) {
  return entries.toSorted((first, second) => {
    switch (sort) {
      case "acquiredAt-asc": return first.acquiredAt.localeCompare(second.acquiredAt);
      case "itemName-asc": return first.itemName.localeCompare(second.itemName);
      case "entryCost-desc": return second.entryCost - first.entryCost;
      case "sellPrice-desc": return (second.sellPrice ?? -1) - (first.sellPrice ?? -1);
      case "profit-desc": return (getEntryProfit(second) ?? Number.NEGATIVE_INFINITY) - (getEntryProfit(first) ?? Number.NEGATIVE_INFINITY);
      case "status-asc": return first.status.localeCompare(second.status);
      default: return second.acquiredAt.localeCompare(first.acquiredAt);
    }
  });
}

/** Renders one commercial-type ledger with its CRUD, filtering, and sale workflows. */
export function Ledger({ commercialType }: { commercialType: CommercialType }) {
  const { state, deleteTrade } = useTracker();
  const { language, t } = useLanguage();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | SaleStatus>("all");
  const [sort, setSort] = useState<SortKey>("acquiredAt-desc");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TradeEntry | null>(null);
  const [selling, setSelling] = useState<TradeEntry | null>(null);
  const [managingRuneEntryId, setManagingRuneEntryId] = useState<string | null>(null);
  const [sellingRune, setSellingRune] = useState<{ entry: TradeEntry; rune: ShatteringRune } | null>(null);
  const managedRuneEntry = state.entries.find((entry) => entry.id === managingRuneEntryId) ?? null;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const entries = sortEntries(
    state.entries.filter((entry) => entry.commercialType === commercialType && (status === "all" || entry.status === status) && entry.itemName.toLocaleLowerCase().includes(normalizedQuery)),
    sort,
  );

  return (
    <div className="page ledger-page">
      <header className="page-header ledger-header-actions">
        <div><p className="eyebrow">{t("ledger.commercialLedger")}</p><h1>{t(commercialTextKeys[commercialType].label)}</h1><p className="page-intro">{t(commercialTextKeys[commercialType].description)}</p></div>
        <button className="primary-button" onClick={() => setCreateOpen(true)} type="button"><CirclePlus aria-hidden="true" size={17} />{t("ledger.newEntry")}</button>
      </header>
      <div className="ledger-toolbar">
        <div className="filter-group">
          <label className="search-field" style={{ display: "block", position: "relative" }}><Search aria-hidden="true" size={16} style={{ color: "var(--muted)", left: 11, pointerEvents: "none", position: "absolute", top: "50%", transform: "translateY(-50%)", zIndex: 1 }} /><span className="sr-only">{t("ledger.searchEntries")}</span><input className="field-control search-control" onChange={(event) => setQuery(event.target.value)} placeholder={t("ledger.searchItem")} style={{ paddingLeft: 35 }} type="search" value={query} /></label>
          <select aria-label={t("ledger.status")} className="field-control" onChange={(event) => setStatus(event.target.value as "all" | SaleStatus)} value={status}><option value="all">{t("ledger.allStatuses")}</option><option value="NOT_SOLD">{t("ledger.notSold")}</option><option value="PARTIALLY_SOLD">{t("ledger.partiallySold")}</option><option value="SOLD">{t("ledger.sold")}</option></select>
          <select aria-label={t("ledger.statusSort")} className="field-control" onChange={(event) => setSort(event.target.value as SortKey)} value={sort}>{sortOptions.map((option) => <option key={option.value} value={option.value}>{t(option.label)}</option>)}</select>
        </div>
        <span className="result-count">{entries.length} {t(entries.length === 1 ? "ledger.entry" : "ledger.entries")}</span>
      </div>
      <div className="ledger-table-wrap">
        {entries.length === 0 ? <div className="empty-table"><CirclePlus aria-hidden="true" size={28} /><p>{t("ledger.noMatchingEntries")}</p><button className="primary-button" onClick={() => setCreateOpen(true)} type="button">{t("ledger.addFirstEntry")}</button></div> : <table className="ledger-table"><thead><tr><th>{t("ledger.item")}</th><th>{t("ledger.entryDate")}</th><th>{t("ledger.quantityShort")}</th><th>{t("ledger.cost")}</th><th>{t("ledger.sale")}</th><th>{t("ledger.profit")}</th><th>{t("ledger.status")}</th><th><span className="sr-only">{t("ledger.actions")}</span></th></tr></thead><tbody>{entries.map((entry) => { const profit = getEntryProfit(entry); const isShatteringEntry = entry.commercialType === "shattering"; const isOpen = entry.status !== "SOLD"; const statusLabel = t(entry.status === "PARTIALLY_SOLD" ? "status.partiallySold" : entry.status === "SOLD" ? "status.sold" : "status.notSold"); return <tr key={entry.id}><td className="item-cell"><strong>{entry.itemName}</strong>{entry.notes && <small>{entry.notes}</small>}</td><td>{formatDate(entry.acquiredAt, language)}</td><td>{entry.quantity}</td><td className="numeric">{formatKamas(entry.entryCost, language)}</td><td className="numeric">{entry.sellPrice === null ? "-" : formatKamas(entry.sellPrice, language)}</td><td className={profit === null ? "numeric" : profit >= 0 ? "profit positive" : "profit negative"}>{profit === null ? "-" : `${profit >= 0 ? "+" : "-"}${formatKamas(Math.abs(profit), language)}`}</td><td><span className={entry.status === "SOLD" ? "status is-sold" : entry.status === "PARTIALLY_SOLD" ? "status is-partial" : "status is-open"}>{statusLabel}</span></td><td><div className="row-actions">{isShatteringEntry && <button className="icon-button" onClick={() => setManagingRuneEntryId(entry.id)} title={t("runes.manage")} type="button"><ListPlus aria-hidden="true" size={17} /></button>}{isOpen && <button className="icon-button" onClick={() => setSelling(entry)} title={t(isShatteringEntry ? "sale.forceCompleteEntry" : "sale.recordSale")} type="button"><Check aria-hidden="true" size={17} /></button>}<button className="icon-button" onClick={() => setEditing(entry)} title={t("entry.edit")} type="button"><Pencil aria-hidden="true" size={16} /></button><button className="icon-button" onClick={() => deleteTrade(entry.id)} title={t("entry.delete")} type="button"><Trash2 aria-hidden="true" size={16} /></button></div></td></tr>; })}</tbody></table>}
      </div>
      {createOpen && <TradeForm commercialType={commercialType} onClose={() => setCreateOpen(false)} />}
      {editing && <TradeForm commercialType={commercialType} entry={editing} onClose={() => setEditing(null)} />}
      {selling && <SaleForm entry={selling} onClose={() => setSelling(null)} />}
      {managedRuneEntry && <RuneManager entry={managedRuneEntry} onClose={() => setManagingRuneEntryId(null)} onRecordSale={(rune) => { setManagingRuneEntryId(null); setSellingRune({ entry: managedRuneEntry, rune }); }} />}
      {sellingRune && <RuneSaleForm entry={sellingRune.entry} onClose={() => setSellingRune(null)} rune={sellingRune.rune} />}
    </div>
  );
}