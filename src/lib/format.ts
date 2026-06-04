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

export function formatNumber(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  return new Intl.NumberFormat("en-PK").format(Number.isFinite(n as number) ? (n as number) : 0);
}

/** Today's date as an ISO `YYYY-MM-DD` string (for date inputs + overdue checks). */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
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
