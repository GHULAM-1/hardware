"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { getAccessToken } from "@/lib/auth-token";
import { queryKeys } from "@/lib/query-keys";
import { KhataStatus } from "@/lib/enums";
import type { KhataValues, ReminderValues } from "@/lib/schemas";
import {
  createKhata,
  createReminder,
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

export function useCreateReminder() {
  const invalidate = useInvalidateKhata();
  return useMutation({
    mutationFn: async (values: ReminderValues) => createReminder(await getAccessToken(), values),
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

/**
 * Mark a khata fulfilled with user feedback. Wraps the status mutation with a
 * success/error toast and exposes `isPending` so callers can disable the button
 * while the update is in flight (the action used to fail silently).
 */
export function useFulfillKhata() {
  const { t } = useTranslation();
  const setStatus = useSetKhataStatus();

  const fulfill = (id: string, onDone?: () => void) =>
    setStatus.mutate(
      { id, status: KhataStatus.Fulfilled },
      {
        onSuccess: () => {
          toast.success(t("khata.markedFulfilled"));
          onDone?.();
        },
        onError: () => toast.error(t("khata.markFailed")),
      },
    );

  // The id currently being saved, so a caller can show a spinner on just that row.
  const pendingId = setStatus.isPending ? setStatus.variables?.id : undefined;

  return { fulfill, isPending: setStatus.isPending, pendingId };
}

export function useDeleteKhata() {
  const invalidate = useInvalidateKhata();
  return useMutation({
    mutationFn: async (id: string) => deleteKhata(await getAccessToken(), id),
    onSuccess: invalidate,
  });
}
