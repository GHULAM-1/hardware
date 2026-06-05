/** Single source of truth for item units (shown in the Unit dropdown). */
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
