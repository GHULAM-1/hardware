import { thresholdBase } from "@/lib/units";
import { displayName } from "@/lib/display";
import type { Language } from "@/lib/enums";
import type { ItemWithStock } from "@/types/models";

/**
 * Client-side filter + sort model for the Items list. The whole catalog is
 * already in hand (see the Items page), so filtering and sorting happen in JS —
 * no round trip per change. Kept pure and UI-free here so the page and its
 * controls share one source of truth.
 */

export type ItemSort =
  | "relevance"
  | "name-asc"
  | "name-desc"
  | "price-asc"
  | "price-desc"
  | "stock-desc"
  | "stock-asc"
  | "new"
  | "old";

/** All items, or narrowed by how much is on hand. */
export type StockFilter = "all" | "in" | "out" | "low";
/** All items, or by whether they're managed in the Warehouse. */
export type TrackFilter = "all" | "tracked" | "untracked";

export type ItemFilterState = {
  sort: ItemSort;
  stock: StockFilter;
  track: TrackFilter;
};

// Alphabetical by name is the default order (was newest-first before).
export const DEFAULT_ITEM_FILTERS: ItemFilterState = {
  sort: "name-asc",
  stock: "all",
  track: "all",
};

/** The chosen sort options, in menu order, with their i18n label keys. */
export const ITEM_SORTS: { key: ItemSort; labelKey: string }[] = [
  { key: "name-asc", labelKey: "itemsSort.nameAsc" },
  { key: "name-desc", labelKey: "itemsSort.nameDesc" },
  { key: "price-asc", labelKey: "itemsSort.priceAsc" },
  { key: "price-desc", labelKey: "itemsSort.priceDesc" },
  { key: "stock-desc", labelKey: "itemsSort.stockDesc" },
  { key: "stock-asc", labelKey: "itemsSort.stockAsc" },
  { key: "new", labelKey: "itemsSort.newest" },
  { key: "old", labelKey: "itemsSort.oldest" },
];

export const STOCK_FILTERS: { key: StockFilter; labelKey: string }[] = [
  { key: "all", labelKey: "itemsFilter.stockAll" },
  { key: "in", labelKey: "itemsFilter.stockIn" },
  { key: "low", labelKey: "itemsFilter.stockLow" },
  { key: "out", labelKey: "itemsFilter.stockOut" },
];

export const TRACK_FILTERS: { key: TrackFilter; labelKey: string }[] = [
  { key: "all", labelKey: "itemsFilter.trackAll" },
  { key: "tracked", labelKey: "itemsFilter.tracked" },
  { key: "untracked", labelKey: "itemsFilter.untracked" },
];

/** How many filters are narrowing the list (for the toolbar badge). Sort doesn't count. */
export function activeFilterCount(s: ItemFilterState): number {
  return (s.stock !== "all" ? 1 : 0) + (s.track !== "all" ? 1 : 0);
}

function matchesStock(item: ItemWithStock, stock: StockFilter): boolean {
  if (stock === "all") return true;
  const qty = Number(item.quantity) || 0;
  if (stock === "in") return qty > 0;
  if (stock === "out") return qty <= 0;
  // "low": at or below the reorder level (and only when one is configured).
  const tb = thresholdBase(item);
  return tb != null && qty <= tb;
}

function matchesTrack(item: ItemWithStock, track: TrackFilter): boolean {
  if (track === "all") return true;
  return track === "tracked" ? item.track_in_warehouse : !item.track_in_warehouse;
}

/**
 * Apply the filters, then the sort. Name sorts compare the DISPLAYED name (so
 * the order matches what the user reads, in their language); price/stock are
 * numeric; new/old use created_at. A stable tiebreak on name keeps equal rows
 * from shuffling between renders.
 */
export function filterAndSortItems(
  items: ItemWithStock[],
  state: ItemFilterState,
  language: Language,
): ItemWithStock[] {
  const name = (i: ItemWithStock) => displayName(i, language);
  const byName = (a: ItemWithStock, b: ItemWithStock) =>
    name(a).localeCompare(name(b), undefined, { numeric: true, sensitivity: "base" });

  const filtered = items.filter(
    (i) => matchesStock(i, state.stock) && matchesTrack(i, state.track),
  );

  const sorted = [...filtered];
  switch (state.sort) {
    case "relevance":
      // Keep the incoming order — the server already ranked it (best match
      // first). Used while searching so the exact hit stays on top. Not a menu
      // option; the page selects it in place of the default sort during search.
      break;
    case "name-asc":
      sorted.sort(byName);
      break;
    case "name-desc":
      sorted.sort((a, b) => byName(b, a));
      break;
    case "price-asc":
      sorted.sort((a, b) => a.selling_price - b.selling_price || byName(a, b));
      break;
    case "price-desc":
      sorted.sort((a, b) => b.selling_price - a.selling_price || byName(a, b));
      break;
    case "stock-desc":
      sorted.sort((a, b) => (Number(b.quantity) || 0) - (Number(a.quantity) || 0) || byName(a, b));
      break;
    case "stock-asc":
      sorted.sort((a, b) => (Number(a.quantity) || 0) - (Number(b.quantity) || 0) || byName(a, b));
      break;
    case "new":
      sorted.sort((a, b) => b.created_at.localeCompare(a.created_at) || byName(a, b));
      break;
    case "old":
      sorted.sort((a, b) => a.created_at.localeCompare(b.created_at) || byName(a, b));
      break;
  }
  return sorted;
}
