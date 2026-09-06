"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  PackageOpen,
} from "lucide-react";
import { useState } from "react";

import {
  getCommercialTotals,
  getEntryProfit,
  getLatestEntries,
  getTrackerTotals,
  type Timeline,
} from "@/lib/kama-tracker/analytics";
import { formatDate, formatKamas } from "@/lib/kama-tracker/formatters";
import { useTracker } from "@/lib/kama-tracker/use-tracker";
import {
  COMMERCIAL_TYPE_DETAILS,
  COMMERCIAL_TYPES,
  type CommercialType,
  type TradeEntry,
} from "@/types/kama-tracker";

const timelines: { value: Timeline; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "all", label: "All time" },
];

function TimelineControl({
  timeline,
  onChange,
}: {
  timeline: Timeline;
  onChange: (timeline: Timeline) => void;
}) {
  return (
    <div className="timeline-control" aria-label="Chart timeline">
      {timelines.map(({ value, label }) => (
        <button
          aria-pressed={timeline === value}
          className={timeline === value ? "is-selected" : ""}
          key={value}
          onClick={() => onChange(value)}
          type="button"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function CommercialBarChart({
  label,
  timeline,
}: {
  label: "Sales" | "Expenses";
  timeline: Timeline;
}) {
  const { state } = useTracker();
  const totals = COMMERCIAL_TYPES.map((commercialType) => ({
    commercialType,
    total: getCommercialTotals(state, commercialType, timeline)[
      label === "Sales" ? "sales" : "expenses"
    ],
  }));
  const maximum = Math.max(...totals.map(({ total }) => total), 1);

  return (
    <section className="chart-panel" aria-labelledby={`${label.toLowerCase()}-chart-title`}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">By commercial type</p>
          <h2 id={`${label.toLowerCase()}-chart-title`}>{label}</h2>
        </div>
        <span className={label === "Sales" ? "chart-key income" : "chart-key expense"}>
          <i aria-hidden="true" />Kamas
        </span>
      </div>
      <div className="bar-chart" role="list" aria-label={`${label} by commercial type`}>
        {totals.map(({ commercialType, total }) => {
          const height = total === 0 ? 0 : Math.max((total / maximum) * 100, 8);
          return (
            <div className="bar-group" key={commercialType} role="listitem">
              <strong>{formatKamas(total)}</strong>
              <div className="bar-track" aria-hidden="true">
                <div
                  className={label === "Sales" ? "bar income" : "bar expense"}
                  style={{ height: `${height}%` }}
                />
              </div>
              <span>{COMMERCIAL_TYPE_DETAILS[commercialType].label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Movement({ entry }: { entry: TradeEntry }) {
  const profit = getEntryProfit(entry);
  const sold = entry.status === "SOLD";
  const movement = sold ? profit ?? 0 : -entry.entryCost;

  return (
    <li className="movement-item">
      <span className={sold ? "movement-icon is-sold" : "movement-icon is-open"}>
        {sold ? <ArrowUpRight aria-hidden="true" size={17} /> : <ArrowDownRight aria-hidden="true" size={17} />}
      </span>
      <span className="movement-detail">
        <strong>{entry.itemName}</strong>
        <small>{formatDate(sold ? entry.soldAt : entry.acquiredAt)}</small>
      </span>
      <span className={movement >= 0 ? "movement-value is-positive" : "movement-value is-negative"}>
        {movement >= 0 ? "+" : "-"}{formatKamas(Math.abs(movement))}
        <small>{sold ? "profit" : "entry cost"}</small>
      </span>
    </li>
  );
}

function RecentMovements({ commercialType }: { commercialType: CommercialType }) {
  const { state } = useTracker();
  const entries = getLatestEntries(state, commercialType);
  const details = COMMERCIAL_TYPE_DETAILS[commercialType];

  return (
    <section className="movement-column" aria-labelledby={`${commercialType}-movements`}>
      <div className="movement-heading">
        <h3 id={`${commercialType}-movements`}>{details.label}</h3>
        <span>{entries.length} recent</span>
      </div>
      {entries.length === 0 ? (
        <div className="empty-movements">
          <PackageOpen aria-hidden="true" size={20} />
          <p>No movement yet.</p>
        </div>
      ) : (
        <ul>{entries.map((entry) => <Movement entry={entry} key={entry.id} />)}</ul>
      )}
    </section>
  );
}

/** Renders the interactive Kama overview dashboard and its timeline controls. */
export function Dashboard() {
  const [timeline, setTimeline] = useState<Timeline>("30d");
  const { state } = useTracker();
  const totals = getTrackerTotals(state, timeline);
  const rangeLabel = timeline === "all" ? "Across all records" : `Over the last ${timeline.replace("d", " days")}`;

  return (
    <div className="page dashboard-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Market desk</p>
          <h1>Kama overview</h1>
          <p className="page-intro">Track what came in, what went out, and what is still on the market.</p>
        </div>
        <TimelineControl timeline={timeline} onChange={setTimeline} />
      </header>
      <section className="summary-grid" aria-label="Financial summary">
        <article className="summary-card is-profit">
          <span className="summary-icon"><CircleDollarSign aria-hidden="true" size={20} /></span>
          <p>Realized balance</p>
          <strong>{totals.profit >= 0 ? "+" : "-"}{formatKamas(Math.abs(totals.profit))}</strong>
          <small>{rangeLabel}</small>
        </article>
        <article className="summary-card"><p>Sales recorded</p><strong>{formatKamas(totals.sales)}</strong><small>Kamas collected</small></article>
        <article className="summary-card"><p>Capital committed</p><strong>{formatKamas(totals.expenses)}</strong><small>Kamas invested</small></article>
        <article className="summary-card"><p>Open listings</p><strong>{totals.openCount}</strong><small>Waiting for a sale</small></article>
      </section>
      <section className="chart-grid"><CommercialBarChart label="Sales" timeline={timeline} /><CommercialBarChart label="Expenses" timeline={timeline} /></section>
      <section className="latest-section" aria-labelledby="latest-movements">
        <div className="panel-heading"><div><p className="eyebrow">Activity</p><h2 id="latest-movements">Latest movements</h2></div></div>
        <div className="movement-grid">{COMMERCIAL_TYPES.map((commercialType) => <RecentMovements commercialType={commercialType} key={commercialType} />)}</div>
      </section>
    </div>
  );
}