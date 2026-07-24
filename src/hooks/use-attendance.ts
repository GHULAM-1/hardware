"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { read } from "@/lib/read-client";
import { getAccessToken } from "@/lib/auth-token";
import { queryKeys } from "@/lib/query-keys";
import type { AttendanceBatchValues } from "@/lib/schemas";
import {
  saveAttendanceBatch,
} from "@/server/actions/attendance";

export function useAttendance(date: string) {
  return useQuery({
    queryKey: queryKeys.attendance(date),
    queryFn: async () => read("attendance.forDate", date),
    enabled: Boolean(date),
  });
}

/** The dates a staff member was absent in `month` (`YYYY-MM`) — for their profile. */
export function useStaffAbsentDates(staffId: string | undefined, month: string) {
  return useQuery({
    queryKey: queryKeys.staffAbsentDates(staffId ?? "", month),
    queryFn: async () => read("attendance.staffAbsentDates", staffId as string, month),
    enabled: Boolean(staffId && month),
  });
}

export function useSaveAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: AttendanceBatchValues) =>
      saveAttendanceBatch(await getAccessToken(), values),
    onSuccess: (_data, values) => {
      qc.invalidateQueries({ queryKey: queryKeys.attendance(values.date) });
      // Refresh the absent-date lists shown on staff profiles.
      qc.invalidateQueries({ queryKey: ["attendance", "absent-dates"] });
      // Attendance affects unpaid-month net.
      qc.invalidateQueries({ queryKey: ["salary"] });
    },
  });
}
