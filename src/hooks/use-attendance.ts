"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getAccessToken } from "@/lib/auth-token";
import { queryKeys } from "@/lib/query-keys";
import type { AttendanceBatchValues } from "@/lib/schemas";
import { getAttendanceForDate, saveAttendanceBatch } from "@/server/actions/attendance";

export function useAttendance(date: string) {
  return useQuery({
    queryKey: queryKeys.attendance(date),
    queryFn: async () => getAttendanceForDate(await getAccessToken(), date),
    enabled: Boolean(date),
  });
}

export function useSaveAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: AttendanceBatchValues) =>
      saveAttendanceBatch(await getAccessToken(), values),
    onSuccess: (_data, values) => {
      qc.invalidateQueries({ queryKey: queryKeys.attendance(values.date) });
      // Attendance affects unpaid-month net.
      qc.invalidateQueries({ queryKey: ["salary"] });
    },
  });
}
