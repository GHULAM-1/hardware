"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getAccessToken } from "@/lib/auth-token";
import { queryKeys } from "@/lib/query-keys";
import type { CustomerValues } from "@/lib/schemas";
import {
  createCustomer,
  deleteCustomer,
  getCustomerOrders,
  getLastPurchase,
  listCustomers,
  listUsedCustomerIds,
  updateCustomer,
} from "@/server/actions/customers";

export function useCustomers(search = "") {
  return useQuery({
    queryKey: queryKeys.customers(search),
    queryFn: async () => listCustomers(await getAccessToken(), search),
  });
}

/** Set of customer ids referenced by an order or khata (delete is blocked for these). */
export function useUsedCustomerIds() {
  return useQuery({
    queryKey: queryKeys.usedCustomerIds(),
    queryFn: async () => listUsedCustomerIds(await getAccessToken()),
    select: (ids) => new Set(ids),
  });
}

export function useCustomerOrders(customerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.customerHistory(customerId ?? ""),
    queryFn: async () => getCustomerOrders(await getAccessToken(), customerId as string),
    enabled: Boolean(customerId),
  });
}

export function useLastPurchase(customerId: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.customer(customerId ?? ""), "last-purchase"],
    queryFn: async () => getLastPurchase(await getAccessToken(), customerId as string),
    enabled: Boolean(customerId),
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: CustomerValues) => createCustomer(await getAccessToken(), values),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; values: CustomerValues }) =>
      updateCustomer(await getAccessToken(), args.id, args.values),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => deleteCustomer(await getAccessToken(), id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}
