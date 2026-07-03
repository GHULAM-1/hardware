"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getAccessToken } from "@/lib/auth-token";
import { queryKeys } from "@/lib/query-keys";
import type { ShortcutMap } from "@/lib/nav-shortcuts";
import {
  getReminderLeadDays,
  setReminderLeadDays,
  getNavShortcuts,
  setNavShortcuts,
} from "@/server/actions/settings";

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

/** The effective nav-shortcut map, used both by the launcher and the badges. */
export function useNavShortcutSettings() {
  return useQuery({
    queryKey: queryKeys.navShortcuts(),
    queryFn: async () => getNavShortcuts(await getAccessToken()),
  });
}

export function useSetNavShortcutSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (map: ShortcutMap) => setNavShortcuts(await getAccessToken(), map),
    // The action returns the resolved map — write it straight into the cache so
    // the sidebar/dashboard badges and the launcher update without a refetch.
    onSuccess: (resolved) => qc.setQueryData(queryKeys.navShortcuts(), resolved),
  });
}

