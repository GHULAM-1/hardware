"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getAccessToken } from "@/lib/auth-token";
import { queryKeys } from "@/lib/query-keys";
import { KhataStatus } from "@/lib/enums";
import type { KhataValues } from "@/lib/schemas";
import {
  createKhata,
  deleteKhata,
  getKhataReminders,
  listKhatas,
  setKhataStatus,
} from "@/server/actions/khata";

export function useKhatas(status = "") {
  return useQuery({
    queryKey: queryKeys.khatas(status),
    queryFn: async () => listKhatas(await getAccessToken(), status),
  });
}

export function useKhataReminders() {
  return useQuery({
    queryKey: queryKeys.khataReminders(),
    queryFn: async () => getKhataReminders(await getAccessToken()),
  });
}

function useInvalidateKhata() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["khatas"] });
}

export function useCreateKhata() {
  const invalidate = useInvalidateKhata();
  return useMutation({
    mutationFn: async (values: KhataValues) => createKhata(await getAccessToken(), values),
    onSuccess: invalidate,
  });
}

export function useSetKhataStatus() {
  const invalidate = useInvalidateKhata();
  return useMutation({
    mutationFn: async (args: { id: string; status: KhataStatus }) =>
      setKhataStatus(await getAccessToken(), args.id, args.status),
    onSuccess: invalidate,
  });
}

export function useDeleteKhata() {
  const invalidate = useInvalidateKhata();
  return useMutation({
    mutationFn: async (id: string) => deleteKhata(await getAccessToken(), id),
    onSuccess: invalidate,
  });
}
