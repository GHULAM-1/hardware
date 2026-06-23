"use server";

import { createActionClient } from "@/lib/supabase/server";
import { StaffAttendanceStatus } from "@/lib/enums";
import { attendanceBatchSchema, type AttendanceBatchValues } from "@/lib/schemas";
import type { AttendanceRow, Staff } from "@/types/models";

/** [start, nextStart) date strings for a `YYYY-MM` month (date columns, no TZ). */
function monthRange(month: string): { start: string; nextStart: string } {
  const [y, m] = month.split("-").map(Number);
  const start = `${month}-01`;
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  const nextStart = `${ny}-${String(nm).padStart(2, "0")}-01`;
  return { start, nextStart };
}

/**
 * The dates a staff member was marked absent in `month` (`YYYY-MM`), oldest first.
 * Powers the attendance detail on a staff profile — the count alone lives on the
 * salary row, but this lists exactly which days were missed.
 */
export async function getStaffAbsentDates(
  accessToken: string,
  staffId: string,
  month: string,
): Promise<string[]> {
  const client = createActionClient(accessToken);
  const { start, nextStart } = monthRange(month);

  const { data, error } = await client
    .from("staff_attendance")
    .select("date")
    .eq("staff_id", staffId)
    .eq("status", StaffAttendanceStatus.Absent)
    .gte("date", start)
    .lt("date", nextStart)
    .order("date", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => r.date);
}

/**
 * Active staff merged with their mark for `date`. Unmarked staff come back with
 * status = null; the daily checklist treats null as "present" (the common case).
 */
export async function getAttendanceForDate(
  accessToken: string,
  date: string,
): Promise<AttendanceRow[]> {
  const client = createActionClient(accessToken);

  const { data: staff, error: e1 } = await client
    .from("staff")
    .select("*")
    .eq("is_active", true)
    // Don't show (or let the owner mark) staff before the day they joined.
    .lte("joined_on", date)
    .order("name");
  if (e1) throw new Error(e1.message);

  const { data: marks, error: e2 } = await client
    .from("staff_attendance")
    .select("staff_id, status, entry_time, exit_time")
    .eq("date", date);
  if (e2) throw new Error(e2.message);

  const byStaff = new Map((marks ?? []).map((m) => [m.staff_id, m]));
  return (staff ?? []).map((s: Staff) => {
    const m = byStaff.get(s.id);
    return {
      staff: s,
      status: m?.status ?? null,
      entry_time: m?.entry_time ?? null,
      exit_time: m?.exit_time ?? null,
    };
  });
}

/** Save the whole day's marks in one upsert (one row per staff per day). */
export async function saveAttendanceBatch(
  accessToken: string,
  values: AttendanceBatchValues,
): Promise<void> {
  const data = attendanceBatchSchema.parse(values);
  const client = createActionClient(accessToken);
  const { data: userData } = await client.auth.getUser();
  const createdBy = userData.user?.id ?? null;

  const rows = data.entries.map((e) => ({
    staff_id: e.staff_id,
    date: data.date,
    status: e.status,
    // Times only make sense for a present day; absent rows clear them.
    entry_time: e.status === StaffAttendanceStatus.Present ? e.entry_time ?? null : null,
    exit_time: e.status === StaffAttendanceStatus.Present ? e.exit_time ?? null : null,
    created_by: createdBy,
  }));

  const { error } = await client
    .from("staff_attendance")
    .upsert(rows, { onConflict: "staff_id,date" });
  if (error) throw new Error(error.message);
}
