"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getAccessToken } from "@/lib/auth-token";
import { queryKeys } from "@/lib/query-keys";
import type { StaffValues } from "@/lib/schemas";
import {
  createStaff,
  deleteStaff,
  getStaff,
  listStaff,
  setStaffActive,
  updateStaff,
} from "@/server/actions/staff";

export function useStaff(search = "", opts: { activeOnly?: boolean } = {}) {
  return useQuery({
    queryKey: [...queryKeys.staff(search), opts.activeOnly ?? false],
    queryFn: async () => listStaff(await getAccessToken(), search, opts),
  });
}

export function useStaffMember(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.staffMember(id ?? ""),
    queryFn: async () => getStaff(await getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: StaffValues) => createStaff(await getAccessToken(), values),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; values: StaffValues }) =>
      updateStaff(await getAccessToken(), args.id, args.values),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useSetStaffActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; isActive: boolean }) =>
      setStaffActive(await getAccessToken(), args.id, args.isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => deleteStaff(await getAccessToken(), id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}
