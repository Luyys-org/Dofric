"use client";

import {
  Check,
  CirclePlus,
  LoaderCircle,
  Pencil,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";

import { getEntryProfit } from "@/lib/kama-tracker/analytics";
import { formatDate, formatKamas, toDateInputValue } from "@/lib/kama-tracker/formatters";
import { extractKamaValues, sumKamaValues } from "@/lib/kama-tracker/ocr";
import { useTracker } from "@/lib/kama-tracker/use-tracker";
import {
  COMMERCIAL_TYPE_DETAILS,
  type CommercialType,
  type SaleStatus,
  type TradeEntry,
} from "@/types/kama-tracker";

type SortKey = "acquiredAt-desc" | "acquiredAt-asc" | "itemName-asc" | "entryCost-desc" | "sellPrice-desc" | "profit-desc" | "status-asc";

const sortOptions: { value: SortKey; label: string }[] = [
  { value: "acquiredAt-desc", label: "Newest first" },
  { value: "acquiredAt-asc", label: "Oldest first" },
  { value: "itemName-asc", label: "Item name" },
  { value: "entryCost-desc", label: "Highest cost" },
  { value: "sellPrice-desc", label: "Highest sale" },
  { value: "profit-desc", label: "Highest profit" },
  { value: "status-asc", label: "Status" },
];

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
          <button className="icon-button" onClick={onClose} title="Close dialog" type="button">
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
  const editing = Boolean(entry);
  const [entryCost, setEntryCost] = useState(entry?.entryCost.toString() ?? "");
  const [ocrValues, setOcrValues] = useState<number[]>([]);
  const [selectedOcrValues, setSelectedOcrValues] = useState<boolean[]>([]);
  const [ocrState, setOcrState] = useState<"idle" | "loading" | "error">("idle");

  async function scanScreenshot(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setOcrState("loading");
    setOcrValues([]);
    setSelectedOcrValues([]);
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", undefined, {
        workerPath: "/tesseract/worker.min.js",
        corePath: "/tesseract/tesseract-core.wasm.js",
        langPath: "/tesseract",
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
    const itemName = String(formData.get("itemName") ?? "").trim();
    const cost = getNumber(formData, "entryCost");
    const quantity = getNumber(formData, "quantity");

    if (!itemName || cost < 0 || quantity <= 0) return;

    const input = {
      itemName,
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
      description={editing ? "Update the entry cost or item details." : "Record what you invested. The listing remains open until you record its sale."}
      onClose={onClose}
      title={editing ? "Edit entry" : "New entry"}
    >
      <form className="dialog-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-field full">
            <label htmlFor="itemName">Item name</label>
            <input className="field-control" defaultValue={entry?.itemName} id="itemName" name="itemName" placeholder="e.g. Gelano" required />
          </div>
          <div className="form-field">
            <label htmlFor="entryCost">Entry cost</label>
            <input className="field-control" id="entryCost" min="0" name="entryCost" onChange={(event) => setEntryCost(event.target.value)} required step="1" type="number" value={entryCost} />
            <div className="ocr-control">
              <label className="upload-button">
                {ocrState === "loading" ? <LoaderCircle aria-hidden="true" className="is-spinning" size={15} /> : <Upload aria-hidden="true" size={15} />}
                {ocrState === "loading" ? "Reading screenshot" : "Scan screenshot"}
                <input accept="image/png,image/jpeg,image/webp" disabled={ocrState === "loading"} onChange={scanScreenshot} type="file" />
              </label>
              <span>Optional: extract prices ending in “kamas”.</span>
            </div>
            {ocrState === "error" && <p className="ocr-error" role="alert">The screenshot could not be read. Enter the total manually.</p>}
            {ocrValues.length > 0 && <div className="ocr-results"><div><strong>{ocrValues.length} prices found</strong><span>{formatKamas(sumKamaValues(ocrValues, selectedOcrValues))} Kamas selected</span></div><ul>{ocrValues.map((value, index) => <li key={`${value}-${index}`}><label><input checked={selectedOcrValues[index]} onChange={() => toggleOcrValue(index)} type="checkbox" /><span>{formatKamas(value)} Kamas</span></label></li>)}</ul></div>}
          </div>
          <div className="form-field" style={{ alignContent: "start", gridTemplateRows: "max-content max-content" }}>
            <label htmlFor="quantity">Quantity</label>
            <input className="field-control" defaultValue={entry?.quantity ?? 1} id="quantity" min="1" name="quantity" required step="1" style={{ alignSelf: "start", height: 38 }} type="number" />
          </div>
          <div className="form-field full">
            <label htmlFor="acquiredAt">Entry date</label>
            <input className="field-control" defaultValue={entry?.acquiredAt ?? toDateInputValue()} id="acquiredAt" name="acquiredAt" required type="date" />
          </div>
          <div className="form-field full">
            <label htmlFor="notes">Notes</label>
            <textarea className="field-control" defaultValue={entry?.notes} id="notes" name="notes" placeholder="Optional details" />
          </div>
        </div>
        <div className="dialog-actions">
          <button className="secondary-button" onClick={onClose} type="button">Cancel</button>
          <button className="primary-button" type="submit">{editing ? "Save changes" : "Add entry"}</button>
        </div>
      </form>
    </Dialog>
  );
}

function SaleForm({ entry, onClose }: { entry: TradeEntry; onClose: () => void }) {
  const { completeSale } = useTracker();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const sellPrice = getNumber(formData, "sellPrice");
    if (sellPrice < 0) return;
    completeSale(entry.id, { sellPrice, soldAt: String(formData.get("soldAt")) });
    onClose();
  }

  return (
    <Dialog description={`Complete the sale for ${entry.itemName}.`} onClose={onClose} title="Record sale">
      <form className="dialog-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-field full">
            <label htmlFor="sellPrice">Sell price</label>
            <input autoFocus className="field-control" id="sellPrice" min="0" name="sellPrice" required step="1" type="number" />
          </div>
          <div className="form-field full">
            <label htmlFor="soldAt">Sale date</label>
            <input className="field-control" defaultValue={toDateInputValue()} id="soldAt" name="soldAt" required type="date" />
          </div>
        </div>
        <div className="dialog-actions">
          <button className="secondary-button" onClick={onClose} type="button">Cancel</button>
          <button className="primary-button" type="submit"><Check aria-hidden="true" size={16} />Complete sale</button>
        </div>
      </form>
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
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | SaleStatus>("all");
  const [sort, setSort] = useState<SortKey>("acquiredAt-desc");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TradeEntry | null>(null);
  const [selling, setSelling] = useState<TradeEntry | null>(null);
  const details = COMMERCIAL_TYPE_DETAILS[commercialType];
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const entries = sortEntries(
    state.entries.filter((entry) => entry.commercialType === commercialType && (status === "all" || entry.status === status) && entry.itemName.toLocaleLowerCase().includes(normalizedQuery)),
    sort,
  );

  return (
    <div className="page ledger-page">
      <header className="page-header ledger-header-actions">
        <div><p className="eyebrow">Commercial ledger</p><h1>{details.label}</h1><p className="page-intro">{details.description}</p></div>
        <button className="primary-button" onClick={() => setCreateOpen(true)} type="button"><CirclePlus aria-hidden="true" size={17} />New entry</button>
      </header>
      <div className="ledger-toolbar">
        <div className="filter-group">
          <label className="search-field" style={{ display: "block", position: "relative" }}><Search aria-hidden="true" size={16} style={{ color: "var(--muted)", left: 11, pointerEvents: "none", position: "absolute", top: "50%", transform: "translateY(-50%)", zIndex: 1 }} /><span className="sr-only">Search entries</span><input className="field-control search-control" onChange={(event) => setQuery(event.target.value)} placeholder="Search item" style={{ paddingLeft: 35 }} type="search" value={query} /></label>
          <select aria-label="Filter by sale status" className="field-control" onChange={(event) => setStatus(event.target.value as "all" | SaleStatus)} value={status}><option value="all">All statuses</option><option value="NOT_SOLD">Not sold</option><option value="SOLD">Sold</option></select>
          <select aria-label="Sort entries" className="field-control" onChange={(event) => setSort(event.target.value as SortKey)} value={sort}>{sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        </div>
        <span className="result-count">{entries.length} {entries.length === 1 ? "entry" : "entries"}</span>
      </div>
      <div className="ledger-table-wrap">
        {entries.length === 0 ? <div className="empty-table"><CirclePlus aria-hidden="true" size={28} /><p>No matching entries in this ledger.</p><button className="primary-button" onClick={() => setCreateOpen(true)} type="button">Add first entry</button></div> : <table className="ledger-table"><thead><tr><th>Item</th><th>Entry date</th><th>Qty.</th><th>Cost</th><th>Sale</th><th>Profit</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{entries.map((entry) => { const profit = getEntryProfit(entry); return <tr key={entry.id}><td className="item-cell"><strong>{entry.itemName}</strong>{entry.notes && <small>{entry.notes}</small>}</td><td>{formatDate(entry.acquiredAt)}</td><td>{entry.quantity}</td><td className="numeric">{formatKamas(entry.entryCost)}</td><td className="numeric">{entry.sellPrice === null ? "-" : formatKamas(entry.sellPrice)}</td><td className={profit === null ? "numeric" : profit >= 0 ? "profit positive" : "profit negative"}>{profit === null ? "-" : `${profit >= 0 ? "+" : "-"}${formatKamas(Math.abs(profit))}`}</td><td><span className={entry.status === "SOLD" ? "status is-sold" : "status is-open"}>{entry.status === "SOLD" ? "SOLD" : "NOT SOLD"}</span></td><td><div className="row-actions">{entry.status === "NOT_SOLD" && <button className="icon-button" onClick={() => setSelling(entry)} title="Record sale" type="button"><Check aria-hidden="true" size={17} /></button>}<button className="icon-button" onClick={() => setEditing(entry)} title="Edit entry" type="button"><Pencil aria-hidden="true" size={16} /></button><button className="icon-button" onClick={() => deleteTrade(entry.id)} title="Delete entry" type="button"><Trash2 aria-hidden="true" size={16} /></button></div></td></tr>; })}</tbody></table>}
      </div>
      {createOpen && <TradeForm commercialType={commercialType} onClose={() => setCreateOpen(false)} />}
      {editing && <TradeForm commercialType={commercialType} entry={editing} onClose={() => setEditing(null)} />}
      {selling && <SaleForm entry={selling} onClose={() => setSelling(null)} />}
    </div>
  );
}