"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { read } from "@/lib/read-client";
import { getAccessToken } from "@/lib/auth-token";
import { queryKeys } from "@/lib/query-keys";
import type { SalaryAdvanceValues, SalaryPaymentValues } from "@/lib/schemas";
import {
  createAdvance,
  deleteAdvance,
  paySalary,
} from "@/server/actions/salary";

export function useSalaryOverview(month: string) {
  return useQuery({
    queryKey: queryKeys.salaryOverview(month),
    queryFn: async () => read("salary.overview", month),
    enabled: Boolean(month),
  });
}

export function useStaffSalary(staffId: string | undefined, month: string) {
  return useQuery({
    queryKey: queryKeys.staffSalary(staffId ?? "", month),
    queryFn: async () => read("salary.forStaff", staffId as string, month),
    enabled: Boolean(staffId && month),
  });
}

export function useAdvances(staffId: string | undefined, month?: string) {
  return useQuery({
    queryKey: queryKeys.advances(staffId ?? "", month),
    queryFn: async () => read("salary.advances", staffId as string, month),
    enabled: Boolean(staffId),
  });
}

function invalidateSalary(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["salary"] });
  qc.invalidateQueries({ queryKey: ["advances"] });
}

export function useCreateAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: SalaryAdvanceValues) => createAdvance(await getAccessToken(), values),
    onSuccess: () => invalidateSalary(qc),
  });
}

export function useDeleteAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => deleteAdvance(await getAccessToken(), id),
    onSuccess: () => invalidateSalary(qc),
  });
}

export function usePaySalary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: SalaryPaymentValues) => paySalary(await getAccessToken(), values),
    onSuccess: () => invalidateSalary(qc),
  });
}
