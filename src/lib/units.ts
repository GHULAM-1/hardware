/** Single source of truth for item units (shown in the Unit dropdown). */
export const UNITS = [
  "pcs",
  "dozen",
  "pair",
  "set",
  "box",
  "pack",
  "bundle",
  "roll",
  "bag",
  "sheet",
  "kg",
  "g",
  "liter",
  "ml",
  "meter",
  "cm",
  "ft",
] as const;

export type Unit = (typeof UNITS)[number];

export const DEFAULT_UNIT: Unit = "pcs";
