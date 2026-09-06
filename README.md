# Dofric

Dofric is a personal financial tracker for Dofus Kama commerce. It tracks money invested in items, completed sales, realized profit, and listings that are still waiting to sell.

The application is deliberately browser-local: it does not require an account, API key, database, or server-side data store.

## Features

- Dashboard with total sales, expenses, realized balance, and open listings.
- Sales and expense bar charts by commercial type for 7, 30, or 90 days, or all time.
- Latest movement lists for Buy / Resell, Crafting, and Magus activities.
- Separate CRUD ledgers for each commercial type.
- Item search, status filtering, and sorting by date, item name, costs, sales, profit, or status.
- Two-stage selling workflow: record the item and entry cost first, then complete the sale whenever it occurs.
- Optional local screenshot OCR for pricing logs, with selectable detected values and automatic total calculation.
- Responsive navigation, data tables, and dialogs for desktop and small screens.

## Commercial Types

| Type | Use case |
| --- | --- |
| Buy / Resell | Buy an item, then resell it for a higher price. |
| Crafting | Buy raw materials and sell the resulting crafted item. |
| Magus | Sell enchanted or improved equipment. |

## Requirements

- Node.js 20.9 or newer
- npm 10 or newer

## Setup

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL printed by Next.js, normally `http://localhost:3000`. Next.js chooses another available port when that port is already in use.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server with Turbopack. |
| `npm run lint` | Run ESLint against application source. |
| `npm run build` | Create and validate a production build. |
| `npm run start` | Run the production build after `npm run build`. |

## Using The Ledger

### Record an entry

1. Open the appropriate commercial ledger.
2. Select **New entry**.
3. Enter the item name, total entry cost, quantity, entry date, and optional notes.
4. Save the entry. Its status is `NOT SOLD` until a sale is recorded.

### Record a sale

1. Find an open entry in its ledger.
2. Select the check action in that row.
3. Enter the total sell price and sale date.
4. Complete the sale. The entry becomes `SOLD`, and its realized profit is calculated as `sell price - entry cost`.

### Scan a screenshot for crafting costs

1. In the new-entry dialog, select **Scan screenshot** below the Entry cost field.
2. Choose a PNG, JPEG, or WebP screenshot.
3. Review the detected values ending in `kama` or `kamas`.
4. Deselect any value that should not count toward the cost.
5. The selected total is copied to Entry cost, where it can still be edited manually.

OCR runs in the browser with Tesseract. It recognizes the price pattern used in Dofus transaction logs, such as `(88 991 kamas)`. Always verify the detected values before saving because OCR can misread low-resolution images, unusual fonts, or partially obscured text.

## Routes

| Route | Screen |
| --- | --- |
| `/` | Kama overview dashboard |
| `/ledger/buy-resell` | Buy / Resell ledger |
| `/ledger/crafting` | Crafting ledger |
| `/ledger/magus` | Magus ledger |

## Data And Privacy

All tracker data is stored in the current browser's `localStorage` under the `dofric:kama-tracker` key.

- Data persists across refreshes and browser restarts on the same browser profile.
- Data is not sent to an application backend or shared across devices.
- Clearing this site's browser storage removes all ledger entries.
- The storage service handles unavailable or blocked browser storage by falling back to the empty initial state.

The OCR worker, WebAssembly core, and English language data are served from `public/tesseract/`, so scanning does not require runtime CDN downloads.

## Architecture

| Area | Responsibility |
| --- | --- |
| `app/` | Next.js App Router pages, application shell, styling, and feature-local dashboard and ledger UI. |
| `app/ledger/[commercialType]/` | Static routes for the three supported commercial ledgers. |
| `lib/storage/` | SSR-safe typed browser storage built on `useSyncExternalStore`. |
| `lib/kama-tracker/` | Tracker persistence facade, React hook, analytics, formatting, OCR parsing, and route resolution. |
| `types/kama-tracker.ts` | Shared commercial, sale, and trade-record contracts. |
| `public/tesseract/` | Locally served Tesseract worker, WebAssembly core, and English language model. |

Feature components do not import each other. Shared behavior is exposed through domain types and utility modules in `lib/kama-tracker/`; persistence is centralized in `lib/kama-tracker/store.ts`.

## Financial Semantics

- Expenses are counted on an entry's acquisition date.
- Sales are counted on an entry's sale date.
- A pending entry contributes to expenses and open listings, but not to sales or realized profit.
- Dashboard timeline controls change only the displayed calculations. They never remove stored records.

## Scope And Future Work

This template does not include authentication, multi-device synchronization, a database, marketplace price imports, inventory tracking, export/import, or Dofus API integration. Those features need a server-side data layer and a user identity model before they should be added.

## Verification

Before shipping a change, run:

```bash
npm run lint
npm run build
```

For interactive changes, also verify a pending entry, sale completion, table filters and sorting, dashboard timeline controls, persistence after refresh, and screenshot OCR in the browser.
