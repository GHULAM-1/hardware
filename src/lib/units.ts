import { MeasurementType } from "@/lib/enums";

/**
 * Legacy free-text unit list (kept for the old UnitSelect, still used where a
 * plain unit string is enough). The measurement model below supersedes it for
 * items — see PRIMARY_UNITS / deriveUnitModel.
 */
export const UNITS = [
  "dozen",
  "box",
  "bundle",
  "roll",
  "kg",
  "liter",
  "ft",
  "in",
] as const;

export type Unit = (typeof UNITS)[number];

// ── Measurement model ──────────────────────────────────────────────────────
// Quantity is stored in a canonical BASE unit per measurement type. The admin
// works in a PRIMARY (bulk) unit; base_per_primary converts between them.
//   count  → base "piece"; primary box/dozen/carton with a user-defined factor
//   weight → base "gram";  primary kg/ton/gram (physical constants)
//   length → base "mm";    primary meter/foot/inch/cm/mm (physical constants)

/** Canonical base unit stored in the DB for each measurement type. */
export const BASE_UNIT: Record<MeasurementType, string> = {
  [MeasurementType.Count]: "piece",
  [MeasurementType.Weight]: "gram",
  [MeasurementType.Length]: "mm",
};

/** Selectable primary (stored) units the admin can pick per measurement type. */
export const PRIMARY_UNITS: Record<MeasurementType, readonly string[]> = {
  [MeasurementType.Count]: ["piece", "box", "dozen", "carton"],
  // Weight tab also offers liter (volume) — stored standalone, see deriveUnitModel.
  [MeasurementType.Weight]: ["kg", "ton", "liter"],
  [MeasurementType.Length]: ["inch", "foot", "meter"],
};

/** Base units (grams) in one of each weight primary unit. */
const WEIGHT_FACTOR: Record<string, number> = { gram: 1, kg: 1000, ton: 1_000_000 };
/** Base units (mm) in one of each length primary unit. Exact physical constants. */
const LENGTH_FACTOR: Record<string, number> = { mm: 1, cm: 10, inch: 25.4, foot: 304.8, meter: 1000 };

/**
 * Units that can be sold interchangeably for an order line, with their per-base
 * factors. An item is sold only within the group of its stored primary unit:
 *   mass   kg/ton (base gram)   ·   volume liter (standalone)   ·   length inch/foot/meter (base mm)
 * Count is handled separately (bulk + piece via base_per_primary).
 */
const SALE_GROUPS: { units: readonly string[]; factor: Record<string, number> }[] = [
  { units: ["kg", "ton"], factor: WEIGHT_FACTOR },
  { units: ["liter"], factor: { liter: 1 } },
  { units: ["inch", "foot", "meter"], factor: LENGTH_FACTOR },
];

/** The convertible group a primary unit belongs to (null = not a grouped unit). */
function groupOf(primaryUnit: string): { units: readonly string[]; factor: Record<string, number> } | null {
  return SALE_GROUPS.find((g) => g.units.includes(primaryUnit)) ?? null;
}

/** A count primary unit that is itself the base piece (no bulk packing). */
export function isCountBaseUnit(primaryUnit: string): boolean {
  return primaryUnit === "piece";
}

/**
 * Resolve the canonical (base_unit, base_per_primary) for an item from its
 * measurement type, primary unit, and — for count bulk units only — the
 * user-supplied pieces-per-primary factor. Single source of truth for the math.
 */
export function deriveUnitModel(
  measurementType: MeasurementType,
  primaryUnit: string,
  countFactor: number | null | undefined,
): { base_unit: string; base_per_primary: number } {
  if (measurementType === MeasurementType.Weight) {
    // Liter is a standalone volume unit (no fixed weight) — store it as its own base.
    if (primaryUnit === "liter") return { base_unit: "liter", base_per_primary: 1 };
    return { base_unit: "gram", base_per_primary: WEIGHT_FACTOR[primaryUnit] ?? 1 };
  }
  if (measurementType === MeasurementType.Length) {
    return { base_unit: "mm", base_per_primary: LENGTH_FACTOR[primaryUnit] ?? 1 };
  }
  // count
  if (isCountBaseUnit(primaryUnit)) return { base_unit: "piece", base_per_primary: 1 };
  return { base_unit: "piece", base_per_primary: Number(countFactor) > 0 ? Number(countFactor) : 1 };
}

/** Does this item sell/break down into a smaller unit (count with a bulk pack)? */
export function hasSubUnit(item: { measurement_type: string; base_per_primary: number }): boolean {
  return item.measurement_type === MeasurementType.Count && item.base_per_primary > 1;
}

/** Convert a primary-unit amount to canonical base units (for storing). */
export function toBase(primaryAmount: number, basePerPrimary: number): number {
  return round2(primaryAmount * basePerPrimary);
}

/** Convert a stored base-unit amount back to the primary unit (for editing/display). */
export function fromBase(baseAmount: number, basePerPrimary: number): number {
  return round2(baseAmount / (basePerPrimary || 1));
}

/** The item's low-stock threshold expressed in base units (null = no low-stock flag). */
export function thresholdBase(item: {
  low_stock_threshold: number | null;
  base_per_primary: number;
}): number | null {
  if (item.low_stock_threshold == null) return null;
  return item.low_stock_threshold * item.base_per_primary;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

type UnitItem = {
  measurement_type: string;
  primary_unit: string;
  base_unit: string;
  base_per_primary: number;
};

type PricedItem = UnitItem & { selling_price: number };

/** A unit an order line can be sold in, with its prefilled price (per that unit). */
export type SaleUnitOption = { unit: string; price: number };

/**
 * Units this item can be sold in, with the selling price for each.
 *  - Count: the primary unit, plus the base "piece" for bulk packs (price = selling_price ÷ pieces).
 *  - Weight/Length: every unit in the primary unit's convertible group (kg/ton, inch/foot/meter),
 *    priced proportionally from the per-base price. Liter is a group of one (sold only in liters).
 * The primary unit always keeps exactly item.selling_price (listed first, no rounding drift).
 */
export function saleUnitOptions(item: PricedItem): SaleUnitOption[] {
  if (item.measurement_type === MeasurementType.Count) {
    const options: SaleUnitOption[] = [{ unit: item.primary_unit, price: item.selling_price }];
    // Whenever the admin picked a bulk unit (box/dozen/carton), also allow selling
    // by the piece — price per piece = bulk price ÷ pieces-per-pack. Use the canonical
    // "piece" base (not item.base_unit, which can be mis-stored as the bulk unit).
    const pieceUnit = BASE_UNIT[MeasurementType.Count];
    if (!isCountBaseUnit(item.primary_unit) && pieceUnit !== item.primary_unit) {
      options.push({
        unit: pieceUnit,
        price: round2(item.selling_price / (item.base_per_primary || 1)),
      });
    }
    return options;
  }

  const group = groupOf(item.primary_unit);
  if (!group) return [{ unit: item.primary_unit, price: item.selling_price }];

  const perBase = item.selling_price / (item.base_per_primary || 1);
  const ordered = [item.primary_unit, ...group.units.filter((u) => u !== item.primary_unit)];
  return ordered.map((u) => ({
    unit: u,
    price: u === item.primary_unit ? item.selling_price : round2(perBase * (group.factor[u] ?? 1)),
  }));
}

/** Prefill selling price for a chosen sale unit (per-unit price). */
export function unitSellingPrice(item: PricedItem, unit: string): number {
  const match = saleUnitOptions(item).find((o) => o.unit === unit);
  return match ? match.price : item.selling_price;
}

/**
 * Human-readable quantity for a base-unit amount, in the item's own units.
 * `label(unitKey)` localizes a unit (pass `(k) => t("units." + k)`).
 *   count bulk:  "5 box 3 piece"   weight: "2.5 kg"   length: "3.5 foot"
 */
export function formatQuantity(
  item: UnitItem,
  baseAmount: number,
  label: (unitKey: string) => string,
): string {
  const qty = Number(baseAmount) || 0;
  if (hasSubUnit(item)) {
    const whole = Math.floor(qty / item.base_per_primary);
    const rem = round2(qty - whole * item.base_per_primary);
    const parts: string[] = [];
    if (whole > 0) parts.push(`${whole} ${label(item.primary_unit)}`);
    if (rem > 0 || whole === 0) parts.push(`${rem} ${label(item.base_unit)}`);
    return parts.join(" ");
  }
  const primaryQty = fromBase(qty, item.base_per_primary);
  return `${primaryQty} ${label(item.primary_unit)}`;
}
