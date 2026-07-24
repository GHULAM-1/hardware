import type { Json } from "@/types/database";

/**
 * Packing styles — the pack sizes an item is stocked/sold in.
 *
 * A shop sells pencils by the piece, but buys and moves them as "1 box = 12",
 * "1 carton = 60", "1 crate = 200". The admin names each pack freely and says
 * how many PRIMARY units it holds; the item detail then prices a whole pack.
 *
 * These are descriptive only. They deliberately take no part in stock or order
 * maths — quantity still lives in canonical base units (see @/lib/units), so a
 * typo in a pack size can never corrupt inventory. Stored as jsonb on `items`
 * (see 20260725010000_item_packings.sql).
 */
export type Packing = {
  /** Free text: "Box", "Carton", "Crate", "Pack of 5"… */
  label: string;
  /** How many PRIMARY units one pack holds. Always > 0. */
  qty: number;
};

/** Matches the DB constraint (`is_valid_packings`) so the UI can't save a row Postgres would reject. */
export const PACKING_LABEL_MAX = 40;
export const PACKINGS_MAX = 20;

/**
 * Read the jsonb column back as a typed list, dropping anything malformed.
 *
 * The column is `Json`, so rows written before the constraint existed — or by
 * anything other than this app — are not guaranteed to fit. Detail views render
 * this directly, so a bad row must degrade to "not shown", never to a crash.
 */
export function itemPackings(item: { packings?: Json | null } | null | undefined): Packing[] {
  const raw = item?.packings;
  if (!Array.isArray(raw)) return [];
  const out: Packing[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const { label, qty } = entry as { label?: unknown; qty?: unknown };
    const name = typeof label === "string" ? label.trim() : "";
    const amount = Number(qty);
    if (!name || !Number.isFinite(amount) || amount <= 0) continue;
    out.push({ label: name, qty: amount });
  }
  return out;
}

/** What a whole pack costs/sells for: per-primary-unit price x units per pack. */
export function packTotal(pricePerUnit: number | null | undefined, packQty: number): number | null {
  if (pricePerUnit == null || !Number.isFinite(Number(pricePerUnit))) return null;
  return Math.round(Number(pricePerUnit) * packQty * 100) / 100;
}
