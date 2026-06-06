"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getAccessToken } from "@/lib/auth-token";
import { queryKeys } from "@/lib/query-keys";
import type { SupplierOrderReceiveValues, SupplierOrderValues } from "@/lib/schemas";
import {
  createSupplierOrder,
  deleteSupplierOrder,
  getSupplierOrder,
  listSupplierOrders,
  markSupplierOrderReceived,
  updateSupplierOrderBill,
} from "@/server/actions/supplier-orders";

export function useSupplierOrders(search = "") {
  return useQuery({
    queryKey: queryKeys.supplierOrders(search),
    queryFn: async () => listSupplierOrders(await getAccessToken(), search),
  });
}

export function useSupplierOrder(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.supplierOrder(id ?? ""),
    queryFn: async () => getSupplierOrder(await getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

export function useCreateSupplierOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: SupplierOrderValues) =>
      createSupplierOrder(await getAccessToken(), values),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supplier-orders"] }),
  });
}

export function useMarkSupplierOrderReceived() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; values: SupplierOrderReceiveValues }) =>
      markSupplierOrderReceived(await getAccessToken(), args.id, args.values),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supplier-orders"] }),
  });
}

export function useUpdateSupplierOrderBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; value: string | null }) =>
      updateSupplierOrderBill(await getAccessToken(), args.id, args.value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supplier-orders"] }),
  });
}

export function useDeleteSupplierOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => deleteSupplierOrder(await getAccessToken(), id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supplier-orders"] }),
  });
}
