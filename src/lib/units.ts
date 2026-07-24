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
// Quantity is stored in a canonical BASE unit. The admin works in a PRIMARY unit;
// base_per_primary converts between them.
//
// The admin used to pick a measurement TYPE first (Count / Weight / Length) and
// then a unit from that type's short list. That split was redundant — a unit
// already tells you its family — so the UI now offers one searchable list of
// every unit, and `measurement_type` is DERIVED from the chosen unit purely to
// keep the existing DB column, order RPCs and reports working unchanged.
//
// Conversion is driven by `base`, never by `type`: two units are interchangeable
// exactly when they share a base. That's why volume and area can live here
// without new enum values — `liter` was already carried under `weight` this way.

/** One selectable unit. `factor` = how many BASE units make one of this unit. */
export type UnitDef = {
  /** Stored in items.primary_unit and used as the `units.<key>` i18n key. */
  key: string;
  /** Written to items.measurement_type (DB compatibility only — see above). */
  type: MeasurementType;
  /** Canonical unit quantities are stored in. Shared base = interchangeable. */
  base: string;
  /** Base units per 1 of this unit. Ignored when `packable` (admin supplies it). */
  factor: number;
  /** Bulk count unit — the admin is asked how many pieces are in one. */
  packable?: boolean;
  /** Heading this unit appears under in the picker. */
  group: "count" | "weight" | "volume" | "length" | "area";
};

/**
 * Every unit the app offers, in picker order.
 *
 * IMPORTANT: the base/factor of any unit that already exists in the database
 * (piece, box, dozen, carton, kg, ton, liter, inch, foot, meter) must never
 * change — stored quantities are expressed in those bases, so altering one would
 * silently reinterpret existing stock.
 */
export const UNIT_CATALOG: readonly UnitDef[] = [
  // Count — base "piece". Everything but `piece` is a pack of a user-set size.
  { key: "piece", type: MeasurementType.Count, base: "piece", factor: 1, group: "count" },
  { key: "pair", type: MeasurementType.Count, base: "piece", factor: 1, packable: true, group: "count" },
  { key: "dozen", type: MeasurementType.Count, base: "piece", factor: 1, packable: true, group: "count" },
  { key: "gross", type: MeasurementType.Count, base: "piece", factor: 1, packable: true, group: "count" },
  { key: "box", type: MeasurementType.Count, base: "piece", factor: 1, packable: true, group: "count" },
  { key: "carton", type: MeasurementType.Count, base: "piece", factor: 1, packable: true, group: "count" },
  { key: "packet", type: MeasurementType.Count, base: "piece", factor: 1, packable: true, group: "count" },
  { key: "bundle", type: MeasurementType.Count, base: "piece", factor: 1, packable: true, group: "count" },
  { key: "set", type: MeasurementType.Count, base: "piece", factor: 1, packable: true, group: "count" },
  { key: "roll", type: MeasurementType.Count, base: "piece", factor: 1, packable: true, group: "count" },
  { key: "coil", type: MeasurementType.Count, base: "piece", factor: 1, packable: true, group: "count" },
  { key: "sheet", type: MeasurementType.Count, base: "piece", factor: 1, packable: true, group: "count" },
  { key: "bag", type: MeasurementType.Count, base: "piece", factor: 1, packable: true, group: "count" },
  { key: "tin", type: MeasurementType.Count, base: "piece", factor: 1, packable: true, group: "count" },
  { key: "drum", type: MeasurementType.Count, base: "piece", factor: 1, packable: true, group: "count" },
  { key: "can", type: MeasurementType.Count, base: "piece", factor: 1, packable: true, group: "count" },
  { key: "tube", type: MeasurementType.Count, base: "piece", factor: 1, packable: true, group: "count" },
  { key: "strip", type: MeasurementType.Count, base: "piece", factor: 1, packable: true, group: "count" },
  { key: "ream", type: MeasurementType.Count, base: "piece", factor: 1, packable: true, group: "count" },

  // Weight — base "gram". Includes the South-Asian trade units.
  { key: "milligram", type: MeasurementType.Weight, base: "gram", factor: 0.001, group: "weight" },
  { key: "gram", type: MeasurementType.Weight, base: "gram", factor: 1, group: "weight" },
  { key: "tola", type: MeasurementType.Weight, base: "gram", factor: 11.6638, group: "weight" },
  { key: "ounce", type: MeasurementType.Weight, base: "gram", factor: 28.3495, group: "weight" },
  { key: "pound", type: MeasurementType.Weight, base: "gram", factor: 453.592, group: "weight" },
  { key: "seer", type: MeasurementType.Weight, base: "gram", factor: 933.105, group: "weight" },
  { key: "kg", type: MeasurementType.Weight, base: "gram", factor: 1000, group: "weight" },
  { key: "maund", type: MeasurementType.Weight, base: "gram", factor: 37_324.2, group: "weight" },
  { key: "quintal", type: MeasurementType.Weight, base: "gram", factor: 100_000, group: "weight" },
  { key: "ton", type: MeasurementType.Weight, base: "gram", factor: 1_000_000, group: "weight" },

  // Volume — base "liter" (NOT millilitre: existing liter rows store factor 1).
  { key: "ml", type: MeasurementType.Weight, base: "liter", factor: 0.001, group: "volume" },
  { key: "liter", type: MeasurementType.Weight, base: "liter", factor: 1, group: "volume" },
  { key: "gallon", type: MeasurementType.Weight, base: "liter", factor: 3.78541, group: "volume" },

  // Length — base "mm".
  { key: "mm", type: MeasurementType.Length, base: "mm", factor: 1, group: "length" },
  { key: "cm", type: MeasurementType.Length, base: "mm", factor: 10, group: "length" },
  { key: "inch", type: MeasurementType.Length, base: "mm", factor: 25.4, group: "length" },
  { key: "foot", type: MeasurementType.Length, base: "mm", factor: 304.8, group: "length" },
  { key: "yard", type: MeasurementType.Length, base: "mm", factor: 914.4, group: "length" },
  { key: "meter", type: MeasurementType.Length, base: "mm", factor: 1000, group: "length" },
  { key: "km", type: MeasurementType.Length, base: "mm", factor: 1_000_000, group: "length" },

  // Area — base "sqft". Tiles, glass, sheet goods.
  { key: "sqft", type: MeasurementType.Length, base: "sqft", factor: 1, group: "area" },
  { key: "sqyd", type: MeasurementType.Length, base: "sqft", factor: 9, group: "area" },
  { key: "sqm", type: MeasurementType.Length, base: "sqft", factor: 10.7639, group: "area" },
];

const UNIT_BY_KEY: Record<string, UnitDef> = Object.fromEntries(
  UNIT_CATALOG.map((u) => [u.key, u]),
);

/** Look a unit up, falling back to `piece` for unknown/legacy values. */
export function unitDef(key: string): UnitDef {
  return UNIT_BY_KEY[key] ?? UNIT_BY_KEY.piece;
}

/** Canonical base unit stored in the DB for each measurement type. */
export const BASE_UNIT: Record<MeasurementType, string> = {
  [MeasurementType.Count]: "piece",
  [MeasurementType.Weight]: "gram",
  [MeasurementType.Length]: "mm",
};

/** Does this unit need a "how many pieces in one?" answer from the admin? */
export function isPackableUnit(primaryUnit: string): boolean {
  return Boolean(unitDef(primaryUnit).packable);
}

/** A count primary unit that is itself the base piece (no bulk packing). */
export function isCountBaseUnit(primaryUnit: string): boolean {
  return primaryUnit === "piece";
}

/**
 * The convertible group a primary unit belongs to: every non-packable unit that
 * shares its base. Packable count units are excluded — their factor is per-item,
 * so a "box" of one product isn't a "box" of another.
 */
function groupOf(
  primaryUnit: string,
): { units: readonly string[]; factor: Record<string, number> } | null {
  const def = unitDef(primaryUnit);
  if (def.packable || def.base === "piece") return null;
  const peers = UNIT_CATALOG.filter((u) => u.base === def.base && !u.packable);
  return {
    units: peers.map((u) => u.key),
    factor: Object.fromEntries(peers.map((u) => [u.key, u.factor])),
  };
}

/**
 * Resolve the canonical (measurement_type, base_unit, base_per_primary) for an
 * item from its primary unit and — for packable count units only — the
 * user-supplied pieces-per-primary factor. Single source of truth for the math.
 */
export function deriveUnitModel(
  primaryUnit: string,
  countFactor: number | null | undefined,
): { measurement_type: MeasurementType; base_unit: string; base_per_primary: number } {
  const def = unitDef(primaryUnit);
  if (def.packable) {
    return {
      measurement_type: def.type,
      base_unit: def.base,
      base_per_primary: Number(countFactor) > 0 ? Number(countFactor) : 1,
    };
  }
  return {
    measurement_type: def.type,
    base_unit: def.base,
    base_per_primary: def.factor,
  };
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
