/**
 * Pure salary math — no I/O, so it's identical wherever it runs (server action,
 * and via that, the assistant). The rule (confirmed with the owner):
 *   perDay           = monthly_salary / days-in-that-calendar-month
 *   earnedSalary     = perDay × payableDays   (prorated for a mid-month joiner)
 *   absenceDeduction = perDay × absentDays
 *   netPayable       = earnedSalary − absenceDeduction − advancesTotal
 * payableDays is the full month for anyone who joined on/before the 1st; for
 * someone who joined mid-month it's join-day…month-end, so their first month is
 * paid per day rather than as a whole month. The net is a SUGGESTION shown to the
 * admin; he enters the actual amount paid. Net may be negative — shown as-is.
 */

/** Number of days in the given month. `month` is 1–12. */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Days in the month for a `YYYY-MM` key. */
export function daysInMonthKey(monthKey: string): number {
  const [y, m] = monthKey.split("-").map(Number);
  return daysInMonth(y, m);
}

/**
 * How many days of a `YYYY-MM` month the employee is entitled to, given their
 * `joined_on` (a `YYYY-MM-DD` date). Joined on/before the month → the whole month;
 * joined within it → join-day…month-end inclusive; joined after it → 0.
 */
export function payableDaysForMonth(joinedOn: string, monthKey: string): number {
  const days = daysInMonthKey(monthKey);
  const monthStart = `${monthKey}-01`;
  const monthEnd = `${monthKey}-${String(days).padStart(2, "0")}`;
  if (joinedOn <= monthStart) return days; // joined before/at this month → full month
  if (joinedOn > monthEnd) return 0; // joined after this month → nothing owed
  const joinDay = Number(joinedOn.slice(8, 10));
  return days - joinDay + 1; // join day … last day, inclusive
}

export type SalaryInput = {
  monthlySalary: number;
  daysInMonth: number;
  /** Days owed this month (full month, or join-day…month-end for a new joiner). */
  payableDays: number;
  absentCount: number;
  advancesTotal: number;
};

export type SalaryBreakdown = {
  perDay: number;
  payableDays: number;
  /** Prorated salary base for the month = perDay × payableDays. */
  earnedSalary: number;
  absenceDeduction: number;
  advancesTotal: number;
  netPayable: number;
};

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computeSalary(input: SalaryInput): SalaryBreakdown {
  const perDay = input.daysInMonth > 0 ? input.monthlySalary / input.daysInMonth : 0;
  const payableDays = Math.max(0, Math.min(input.payableDays, input.daysInMonth));
  const earnedSalary = round2(perDay * payableDays);
  const absenceDeduction = round2(perDay * input.absentCount);
  const advancesTotal = round2(input.advancesTotal);
  const netPayable = round2(earnedSalary - absenceDeduction - advancesTotal);
  return { perDay: round2(perDay), payableDays, earnedSalary, absenceDeduction, advancesTotal, netPayable };
}
