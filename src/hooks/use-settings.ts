"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getAccessToken } from "@/lib/auth-token";
import { queryKeys } from "@/lib/query-keys";
import { getReminderLeadDays, setReminderLeadDays } from "@/server/actions/settings";

export function useReminderLeadDays() {
  return useQuery({
    queryKey: queryKeys.settings(),
    queryFn: async () => getReminderLeadDays(await getAccessToken()),
  });
}

export function useSetReminderLeadDays() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (days: number) => setReminderLeadDays(await getAccessToken(), days),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.settings() }),
  });
}
