"use client";

import {
  ChartNoAxesCombined,
  Hammer,
  House,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useLanguage } from "./language-provider";

const navigation = [
  { href: "/", label: "nav.overview", icon: House },
  { href: "/ledger/buy-resell", label: "nav.buyResell", icon: RefreshCw },
  { href: "/ledger/crafting", label: "nav.crafting", icon: Hammer },
  { href: "/ledger/shattering", label: "nav.shattering", icon: Hammer },
  { href: "/ledger/archimonster-sell", label: "nav.archimonsterSell", icon: ShoppingBag },
  { href: "/ledger/magus", label: "nav.magus", icon: ShoppingBag },
] as const;

/** Renders the persistent navigation shell around each application route. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label={t("nav.overviewAria")}>
          <span className="brand-mark" aria-hidden="true">
            K
          </span>
          <span>
            <strong>Dofric</strong>
            <small>{t("app.kamaLedger")}</small>
          </span>
        </Link>
        <nav className="main-nav" aria-label={t("nav.ledger")}>
          <p>{t("nav.ledger")}</p>
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                className={active ? "nav-link is-active" : "nav-link"}
                href={href}
                key={href}
              >
                <Icon aria-hidden="true" size={18} strokeWidth={2.2} />
                <span>{t(label)}</span>
              </Link>
            );
          })}
        </nav>
        <label className="language-switcher">
          <span>{t("language.choose")}</span>
          <select onChange={(event) => setLanguage(event.target.value as "en" | "fr")} value={language}>
            <option value="en">{t("language.english")}</option>
            <option value="fr">{t("language.french")}</option>
          </select>
        </label>
        <div className="sidebar-note">
          <ChartNoAxesCombined aria-hidden="true" size={18} />
          <p>{t("nav.privacy")}</p>
        </div>
      </aside>
      <main className="app-content">{children}</main>
    </div>
  );
}