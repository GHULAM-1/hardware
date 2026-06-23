"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { getAccessToken } from "@/lib/auth-token";
import { queryKeys } from "@/lib/query-keys";
import { KhataStatus } from "@/lib/enums";
import type { KhataValues, KhataUpdateValues, ReminderValues } from "@/lib/schemas";
import {
  createKhata,
  createReminder,
  deleteKhata,
  fulfillKhatas,
  getKhataReminders,
  listKhatas,
  setKhataStatus,
  updateKhata,
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
  return () => {
    void qc.invalidateQueries({ queryKey: ["khatas"] });
    // A khata's due-date edit also updates the linked order's udhaar date.
    void qc.invalidateQueries({ queryKey: ["orders"] });
  };
}

export function useCreateKhata() {
  const invalidate = useInvalidateKhata();
  return useMutation({
    mutationFn: async (values: KhataValues) => createKhata(await getAccessToken(), values),
    onSuccess: invalidate,
  });
}

export function useUpdateKhata() {
  const invalidate = useInvalidateKhata();
  return useMutation({
    mutationFn: async (args: { id: string; values: KhataUpdateValues }) =>
      updateKhata(await getAccessToken(), args.id, args.values),
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

/** Mark every pending entry of a customer fulfilled in one call ("Settle all"). */
export function useSettleAllKhata() {
  const invalidate = useInvalidateKhata();
  return useMutation({
    mutationFn: async (ids: string[]) => fulfillKhatas(await getAccessToken(), ids),
    onSuccess: invalidate,
  });
}
