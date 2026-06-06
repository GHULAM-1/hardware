/**
 * Pure salary math — no I/O, so it's identical wherever it runs (server action,
 * and via that, the assistant). The rule (confirmed with the owner):
 *   perDay           = monthly_salary / days-in-that-calendar-month
 *   absenceDeduction = perDay × absentDays
 *   netPayable       = monthly_salary − absenceDeduction − advancesTotal
 * The net is a SUGGESTION shown to the admin; he enters the actual amount paid.
 * Net may be negative (over-advanced) — that's allowed and shown as-is.
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

export type SalaryInput = {
  monthlySalary: number;
  daysInMonth: number;
  absentCount: number;
  advancesTotal: number;
};

export type SalaryBreakdown = {
  perDay: number;
  absenceDeduction: number;
  advancesTotal: number;
  netPayable: number;
};

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computeSalary(input: SalaryInput): SalaryBreakdown {
  const perDay = input.daysInMonth > 0 ? input.monthlySalary / input.daysInMonth : 0;
  const absenceDeduction = round2(perDay * input.absentCount);
  const advancesTotal = round2(input.advancesTotal);
  const netPayable = round2(input.monthlySalary - absenceDeduction - advancesTotal);
  return { perDay: round2(perDay), absenceDeduction, advancesTotal, netPayable };
}
