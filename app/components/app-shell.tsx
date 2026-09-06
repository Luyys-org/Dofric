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

const navigation = [
  { href: "/", label: "Overview", icon: House },
  { href: "/ledger/buy-resell", label: "Buy / Resell", icon: RefreshCw },
  { href: "/ledger/crafting", label: "Crafting", icon: Hammer },
  { href: "/ledger/magus", label: "Magus", icon: ShoppingBag },
] as const;

/** Renders the persistent navigation shell around each application route. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Dofric overview">
          <span className="brand-mark" aria-hidden="true">
            K
          </span>
          <span>
            <strong>Dofric</strong>
            <small>Kama ledger</small>
          </span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          <p>Ledger</p>
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                className={active ? "nav-link is-active" : "nav-link"}
                href={href}
                key={href}
              >
                <Icon aria-hidden="true" size={18} strokeWidth={2.2} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-note">
          <ChartNoAxesCombined aria-hidden="true" size={18} />
          <p>Your figures stay in this browser.</p>
        </div>
      </aside>
      <main className="app-content">{children}</main>
    </div>
  );
}