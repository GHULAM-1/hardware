"use server";

import { createActionClient } from "@/lib/supabase/server";
import { attendanceBatchSchema, type AttendanceBatchValues } from "@/lib/schemas";
import type { AttendanceRow, Staff } from "@/types/models";

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
    .order("name");
  if (e1) throw new Error(e1.message);

  const { data: marks, error: e2 } = await client
    .from("staff_attendance")
    .select("staff_id, status")
    .eq("date", date);
  if (e2) throw new Error(e2.message);

  const byStaff = new Map((marks ?? []).map((m) => [m.staff_id, m.status]));
  return (staff ?? []).map((s: Staff) => ({ staff: s, status: byStaff.get(s.id) ?? null }));
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
    created_by: createdBy,
  }));

  const { error } = await client
    .from("staff_attendance")
    .upsert(rows, { onConflict: "staff_id,date" });
  if (error) throw new Error(error.message);
}
