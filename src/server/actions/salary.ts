"use server";

import { createActionClient } from "@/lib/supabase/server";
import { runQuery } from "@/server/actions/_client";
import {
  salaryAdvanceSchema,
  salaryPaymentSchema,
  type SalaryAdvanceValues,
  type SalaryPaymentValues,
} from "@/lib/schemas";
import { StaffAttendanceStatus } from "@/lib/enums";
import { computeSalary, daysInMonthKey, payableDaysForMonth, round2 } from "@/lib/salary";
import type { SalaryAdvance, SalaryPayment, Staff, StaffSalaryDetail, StaffSalaryRow } from "@/types/models";

/** [start, nextStart) date strings for a `YYYY-MM` month (date columns, no TZ). */
function monthRange(month: string): { start: string; nextStart: string } {
  const [y, m] = month.split("-").map(Number);
  const start = `${month}-01`;
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  const nextStart = `${ny}-${String(nm).padStart(2, "0")}-01`;
  return { start, nextStart };
}

// ── Advances ─────────────────────────────────────────────────────────────────

export async function listAdvances(
  accessToken: string,
  staffId: string,
  month?: string,
): Promise<SalaryAdvance[]> {
  return runQuery(accessToken, (c) => {
    let q = c
      .from("salary_advances")
      .select("*")
      .eq("staff_id", staffId)
      .order("advance_date", { ascending: false });
    if (month) {
      const { start, nextStart } = monthRange(month);
      q = q.gte("advance_date", start).lt("advance_date", nextStart);
    }
    return q;
  });
}

export async function createAdvance(
  accessToken: string,
  values: SalaryAdvanceValues,
): Promise<SalaryAdvance> {
  const data = salaryAdvanceSchema.parse(values);
  const client = createActionClient(accessToken);
  const { data: userData } = await client.auth.getUser();
  const { data: row, error } = await client
    .from("salary_advances")
    .insert({ ...data, created_by: userData.user?.id ?? null })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return row;
}

export async function deleteAdvance(accessToken: string, id: string): Promise<null> {
  return runQuery(accessToken, (c) =>
    c.from("salary_advances").delete().eq("id", id).then((r) => ({ data: null, error: r.error })),
  );
}

// ── Salary computation ───────────────────────────────────────────────────────

/** Build a salary row from a staff member's live data OR a recorded payment snapshot. */
function buildRow(
  staff: Staff,
  month: string,
  absentDays: number,
  advancesTotal: number,
  payment: SalaryPayment | null,
): StaffSalaryRow {
  const days = daysInMonthKey(month);
  const payableDays = payableDaysForMonth(staff.joined_on, month);
  if (payment) {
    // Paid months render from their snapshot so later edits never rewrite them.
    // earnedSalary isn't stored, but it's exactly what the net was built from:
    // net = earned − absence − advances ⇒ earned = net + absence + advances.
    const perDay = days > 0 ? payment.monthly_salary / days : 0;
    return {
      staff,
      daysInMonth: days,
      payableDays,
      absentDays,
      perDay: round2(perDay),
      earnedSalary: round2(payment.computed_net + payment.absence_deduction + payment.advances_total),
      absenceDeduction: payment.absence_deduction,
      advancesTotal: payment.advances_total,
      netPayable: payment.computed_net,
      paid: true,
      amountPaid: payment.amount_paid,
      paidOn: payment.paid_on,
      paymentNote: payment.note,
    };
  }
  const b = computeSalary({
    monthlySalary: staff.monthly_salary,
    daysInMonth: days,
    payableDays,
    absentCount: absentDays,
    advancesTotal,
  });
  return {
    staff,
    daysInMonth: days,
    payableDays,
    absentDays,
    perDay: b.perDay,
    earnedSalary: b.earnedSalary,
    absenceDeduction: b.absenceDeduction,
    advancesTotal: b.advancesTotal,
    netPayable: b.netPayable,
    paid: false,
    amountPaid: null,
    paidOn: null,
    paymentNote: null,
  };
}

/** One staff member's salary for a month, with that month's advances listed. */
export async function getStaffSalary(
  accessToken: string,
  staffId: string,
  month: string,
): Promise<StaffSalaryDetail> {
  const client = createActionClient(accessToken);
  const { start, nextStart } = monthRange(month);

  const [staffRes, attRes, advRes, payRes] = await Promise.all([
    client.from("staff").select("*").eq("id", staffId).single(),
    client
      .from("staff_attendance")
      .select("date, status, entry_time, exit_time")
      .eq("staff_id", staffId)
      .gte("date", start)
      .lt("date", nextStart)
      .order("date", { ascending: true }),
    client
      .from("salary_advances")
      .select("*")
      .eq("staff_id", staffId)
      .gte("advance_date", start)
      .lt("advance_date", nextStart)
      .order("advance_date", { ascending: false }),
    client
      .from("salary_payments")
      .select("*")
      .eq("staff_id", staffId)
      .eq("period_month", start)
      .maybeSingle(),
  ]);
  if (staffRes.error) throw new Error(staffRes.error.message);
  if (attRes.error) throw new Error(attRes.error.message);
  if (advRes.error) throw new Error(advRes.error.message);
  if (payRes.error) throw new Error(payRes.error.message);

  // Advances only count from the join date — a mid-month joiner's salary window
  // starts when they joined, so anything dated before that isn't theirs to repay.
  const joinedOn = staffRes.data.joined_on;
  const advances = (advRes.data ?? []).filter((a) => a.advance_date >= joinedOn);
  const advancesTotal = advances.reduce((sum, a) => sum + Number(a.amount), 0);
  const attendance = attRes.data ?? [];
  const absentDays = attendance.filter((a) => a.status === StaffAttendanceStatus.Absent).length;
  const row = buildRow(staffRes.data, month, absentDays, advancesTotal, payRes.data);
  return { ...row, advances, attendance };
}

/** Every active staff (plus anyone paid that month) with their salary picture. */
export async function listSalaryOverview(
  accessToken: string,
  month: string,
): Promise<StaffSalaryRow[]> {
  const client = createActionClient(accessToken);
  const { start, nextStart } = monthRange(month);

  const [staffRes, attRes, advRes, payRes] = await Promise.all([
    client.from("staff").select("*").order("name"),
    client
      .from("staff_attendance")
      .select("staff_id")
      .eq("status", StaffAttendanceStatus.Absent)
      .gte("date", start)
      .lt("date", nextStart),
    client
      .from("salary_advances")
      .select("staff_id, amount, advance_date")
      .gte("advance_date", start)
      .lt("advance_date", nextStart),
    client.from("salary_payments").select("*").eq("period_month", start),
  ]);
  if (staffRes.error) throw new Error(staffRes.error.message);
  if (attRes.error) throw new Error(attRes.error.message);
  if (advRes.error) throw new Error(advRes.error.message);
  if (payRes.error) throw new Error(payRes.error.message);

  // Join date per staff — used to drop attendance/advances from before they joined.
  const joinedByStaff = new Map((staffRes.data ?? []).map((s) => [s.id, s.joined_on]));

  const absentByStaff = new Map<string, number>();
  for (const r of attRes.data ?? [])
    absentByStaff.set(r.staff_id, (absentByStaff.get(r.staff_id) ?? 0) + 1);

  const advByStaff = new Map<string, number>();
  for (const r of advRes.data ?? []) {
    const joined = joinedByStaff.get(r.staff_id);
    if (joined && r.advance_date < joined) continue; // advance predates the join date
    advByStaff.set(r.staff_id, (advByStaff.get(r.staff_id) ?? 0) + Number(r.amount));
  }

  const payByStaff = new Map((payRes.data ?? []).map((p) => [p.staff_id, p]));

  // Active staff, plus inactive staff who were paid that month (so history shows).
  // Exclude anyone who joined AFTER this month — they never worked it, so they must
  // not show up owed a full salary (or fines) for months before they were hired.
  // joined_on < nextStart ⇒ joined on or before this month's end (ISO date compare).
  const rows = (staffRes.data ?? []).filter(
    (s) => (s.is_active || payByStaff.has(s.id)) && s.joined_on < nextStart,
  );
  return rows.map((s) =>
    buildRow(s, month, absentByStaff.get(s.id) ?? 0, advByStaff.get(s.id) ?? 0, payByStaff.get(s.id) ?? null),
  );
}

/** Record the salary actually paid for a month. Net is recomputed server-side and
 *  snapshot; only amount_paid/paid_on/note come from the admin. Upserts per month. */
export async function paySalary(
  accessToken: string,
  values: SalaryPaymentValues,
): Promise<SalaryPayment> {
  const data = salaryPaymentSchema.parse(values);
  const client = createActionClient(accessToken);
  const { data: userData } = await client.auth.getUser();
  const { start, nextStart } = monthRange(data.period_month);

  const [staffRes, attRes, advRes] = await Promise.all([
    client.from("staff").select("monthly_salary, joined_on").eq("id", data.staff_id).single(),
    client
      .from("staff_attendance")
      .select("id")
      .eq("staff_id", data.staff_id)
      .eq("status", StaffAttendanceStatus.Absent)
      .gte("date", start)
      .lt("date", nextStart),
    client
      .from("salary_advances")
      .select("amount, advance_date")
      .eq("staff_id", data.staff_id)
      .gte("advance_date", start)
      .lt("advance_date", nextStart),
  ]);
  if (staffRes.error) throw new Error(staffRes.error.message);
  if (attRes.error) throw new Error(attRes.error.message);
  if (advRes.error) throw new Error(advRes.error.message);

  // Only advances on/after the join date count toward this month's salary.
  const joinedOn = staffRes.data.joined_on;
  const advancesTotal = (advRes.data ?? [])
    .filter((a) => a.advance_date >= joinedOn)
    .reduce((sum, a) => sum + Number(a.amount), 0);
  const b = computeSalary({
    monthlySalary: staffRes.data.monthly_salary,
    daysInMonth: daysInMonthKey(data.period_month),
    payableDays: payableDaysForMonth(joinedOn, data.period_month),
    absentCount: attRes.data?.length ?? 0,
    advancesTotal,
  });

  const { data: row, error } = await client
    .from("salary_payments")
    .upsert(
      {
        staff_id: data.staff_id,
        period_month: start,
        amount_paid: data.amount_paid,
        paid_on: data.paid_on,
        note: data.note,
        monthly_salary: staffRes.data.monthly_salary,
        absence_deduction: b.absenceDeduction,
        advances_total: b.advancesTotal,
        computed_net: b.netPayable,
        created_by: userData.user?.id ?? null,
      },
      { onConflict: "staff_id,period_month" },
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return row;
}
