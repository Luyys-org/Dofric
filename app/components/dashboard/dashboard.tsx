"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  PackageOpen,
} from "lucide-react";
import { useState } from "react";

import { commercialTextKeys } from "@/lib/i18n";
import {
  getCommercialTotals,
  getEntryProfit,
  getLatestEntries,
  getTrackerTotals,
  type Timeline,
} from "@/lib/kama-tracker/analytics";
import { formatDate, formatKamas } from "@/lib/kama-tracker/formatters";
import { useTracker } from "@/lib/kama-tracker/use-tracker";
import { useLanguage } from "@/app/components/language-provider";
import {
  COMMERCIAL_TYPES,
  type CommercialType,
  type TradeEntry,
} from "@/types/kama-tracker";

const timelines: { value: Timeline; label: "dashboard.days" | "dashboard.allTime" }[] = [
  { value: "7d", label: "dashboard.days" },
  { value: "30d", label: "dashboard.days" },
  { value: "90d", label: "dashboard.days" },
  { value: "all", label: "dashboard.allTime" },
];

function TimelineControl({
  timeline,
  onChange,
}: {
  timeline: Timeline;
  onChange: (timeline: Timeline) => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="timeline-control" aria-label={t("dashboard.timeline")}>
      {timelines.map(({ value, label }) => (
        <button
          aria-pressed={timeline === value}
          className={timeline === value ? "is-selected" : ""}
          key={value}
          onClick={() => onChange(value)}
          type="button"
        >
          {value === "all" ? t(label) : t(label, { count: value.replace("d", "") })}
        </button>
      ))}
    </div>
  );
}

function CommercialBarChart({ timeline }: { timeline: Timeline }) {
  const { state } = useTracker();
  const { language, t } = useLanguage();
  const totals = COMMERCIAL_TYPES.map((commercialType) => ({
    commercialType,
    ...getCommercialTotals(state, commercialType, timeline),
  }));
  const maximum = Math.max(
    ...totals.flatMap(({ sales, expenses }) => [sales, expenses]),
    1,
  );

  return (
    <section className="chart-panel" aria-labelledby="commercial-chart-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{t("dashboard.byCommercialType")}</p>
          <h2 id="commercial-chart-title">{t("dashboard.salesAndExpenses")}</h2>
        </div>
        <span className="chart-keys">
          <span className="chart-key income"><i aria-hidden="true" />{t("dashboard.sales")}</span>
          <span className="chart-key expense"><i aria-hidden="true" />{t("dashboard.expenses")}</span>
        </span>
      </div>
      <div className="bar-chart-wrap">
        <div className="bar-chart" role="list" aria-label={t("dashboard.byCommercialType")}>
        {totals.map(({ commercialType, expenses, sales }) => {
          const salesHeight = sales === 0 ? 0 : Math.max((sales / maximum) * 100, 8);
          const expensesHeight = expenses === 0 ? 0 : Math.max((expenses / maximum) * 100, 8);
          return (
            <div className="bar-group" key={commercialType} role="listitem">
              <div className="bar-values"><strong>{formatKamas(sales, language)}</strong><strong>{formatKamas(expenses, language)}</strong></div>
              <div className="bar-track" aria-hidden="true">
                <div className="bar income" style={{ height: `${salesHeight}%` }} />
                <div className="bar expense" style={{ height: `${expensesHeight}%` }} />
              </div>
              <span>{t(commercialTextKeys[commercialType].label)}</span>
            </div>
          );
        })}
        </div>
      </div>
    </section>
  );
}

function Movement({ entry }: { entry: TradeEntry }) {
  const { language, t } = useLanguage();
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
        <small>{formatDate(sold ? entry.soldAt : entry.acquiredAt, language)}</small>
      </span>
      <span className={movement >= 0 ? "movement-value is-positive" : "movement-value is-negative"}>
        {movement >= 0 ? "+" : "-"}{formatKamas(Math.abs(movement), language)}
        <small>{t(sold ? "dashboard.profit" : "dashboard.entryCost")}</small>
      </span>
    </li>
  );
}

function RecentMovements({ commercialType }: { commercialType: CommercialType }) {
  const { state } = useTracker();
  const { t } = useLanguage();
  const entries = getLatestEntries(state, commercialType);

  return (
    <section className="movement-column" aria-labelledby={`${commercialType}-movements`}>
      <div className="movement-heading">
        <h3 id={`${commercialType}-movements`}>{t(commercialTextKeys[commercialType].label)}</h3>
        <span>{t("dashboard.recent", { count: entries.length })}</span>
      </div>
      {entries.length === 0 ? (
        <div className="empty-movements">
          <PackageOpen aria-hidden="true" size={20} />
          <p>{t("dashboard.noMovement")}</p>
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
  const { language, t } = useLanguage();
  const totals = getTrackerTotals(state, timeline);
  const rangeLabel = timeline === "all" ? t("dashboard.acrossAllRecords") : t("dashboard.lastDays", { count: timeline.replace("d", "") });

  return (
    <div className="page dashboard-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t("dashboard.marketDesk")}</p>
          <h1>{t("dashboard.kamaOverview")}</h1>
          <p className="page-intro">{t("dashboard.intro")}</p>
        </div>
        <TimelineControl timeline={timeline} onChange={setTimeline} />
      </header>
      <section className="summary-grid" aria-label={t("dashboard.realizedBalance")}>
        <article className="summary-card is-profit">
          <span className="summary-icon"><CircleDollarSign aria-hidden="true" size={20} /></span>
          <p>{t("dashboard.realizedBalance")}</p>
          <strong>{totals.profit >= 0 ? "+" : "-"}{formatKamas(Math.abs(totals.profit), language)}</strong>
          <small>{rangeLabel}</small>
        </article>
        <article className="summary-card"><p>{t("dashboard.salesRecorded")}</p><strong>{formatKamas(totals.sales, language)}</strong><small>{t("dashboard.kamasCollected")}</small></article>
        <article className="summary-card"><p>{t("dashboard.capitalCommitted")}</p><strong>{formatKamas(totals.expenses, language)}</strong><small>{t("dashboard.kamasInvested")}</small></article>
        <article className="summary-card"><p>{t("dashboard.openListings")}</p><strong>{totals.openCount}</strong><small>{t("dashboard.waitingForSale")}</small></article>
      </section>
      <CommercialBarChart timeline={timeline} />
      <section className="latest-section" aria-labelledby="latest-movements">
        <div className="panel-heading"><div><p className="eyebrow">{t("dashboard.activity")}</p><h2 id="latest-movements">{t("dashboard.latestMovements")}</h2></div></div>
        <div className="movement-grid">{COMMERCIAL_TYPES.map((commercialType) => <RecentMovements commercialType={commercialType} key={commercialType} />)}</div>
      </section>
    </div>
  );
}