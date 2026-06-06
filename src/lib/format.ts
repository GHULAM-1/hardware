/**
 * Shared formatting helpers. Pricing is always PKR (per the agreement).
 * Numbers/currency always render LTR even in Urdu/RTL mode.
 */

const pkr = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 2,
});

export function formatPKR(amount: number | string | null | undefined): string {
  const n = typeof amount === "string" ? Number(amount) : amount ?? 0;
  return pkr.format(Number.isFinite(n as number) ? (n as number) : 0);
}

const pkrCompact = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Short currency for chart labels, e.g. "PKR 162K". */
export function formatCompactPKR(amount: number | string | null | undefined): string {
  const n = typeof amount === "string" ? Number(amount) : amount ?? 0;
  return pkrCompact.format(Number.isFinite(n as number) ? (n as number) : 0);
}

export function formatNumber(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  return new Intl.NumberFormat("en-PK").format(Number.isFinite(n as number) ? (n as number) : 0);
}

/** Today's date as an ISO `YYYY-MM-DD` string (for date inputs + overdue checks). */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Today's date as a LOCAL `YYYY-MM-DD` (en-CA yields ISO order). Unlike todayISO()
 * (which is UTC and rolls over ~5h early in PKT), this matches the shopkeeper's
 * wall-clock day — use it for attendance defaults and salary month boundaries.
 */
export function todayLocalISO(): string {
  return new Date().toLocaleDateString("en-CA");
}

/** Current local month as `YYYY-MM` (for the salary screen's default period). */
export function monthKeyLocal(): string {
  return todayLocalISO().slice(0, 7);
}

/** Format raw CNIC digits for display: 3520112345671 -> 35201-1234567-1. */
export function formatCnic(raw: string | null | undefined): string {
  const d = (raw ?? "").replace(/\D/g, "");
  if (d.length !== 13) return raw ?? "";
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}
