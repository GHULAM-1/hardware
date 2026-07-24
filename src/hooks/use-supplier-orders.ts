"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { read } from "@/lib/read-client";
import { getAccessToken } from "@/lib/auth-token";
import { queryKeys } from "@/lib/query-keys";
import type { SupplierOrderTallyValues, SupplierOrderValues } from "@/lib/schemas";
import {
  createSupplierOrder,
  deleteSupplierOrder,
  saveSupplierOrderTally,
  updateSupplierOrder,
  updateSupplierOrderBill,
} from "@/server/actions/supplier-orders";

export function useSupplierOrders(search = "") {
  return useQuery({
    queryKey: queryKeys.supplierOrders(search),
    queryFn: async () => read("supplierOrders.list", search),
  });
}

export function useSupplierOrder(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.supplierOrder(id ?? ""),
    queryFn: async () => read("supplierOrders.get", id as string),
    enabled: Boolean(id),
  });
}

export function useSupplierOrdersBySupplier(supplierId: string | undefined) {
  return useQuery({
    queryKey: ["supplier-orders", "by-supplier", supplierId ?? ""],
    queryFn: async () => read("supplierOrders.bySupplier", supplierId as string),
    enabled: Boolean(supplierId),
  });
}

export function useFrequentItemsForSupplier(supplierId: string | undefined) {
  return useQuery({
    queryKey: ["supplier-orders", "frequent", supplierId ?? ""],
    queryFn: async () => read("supplierOrders.frequentItems", supplierId as string),
    enabled: Boolean(supplierId),
  });
}

/** Items we buy from a supplier — ordered history, or bought (stock-in) fallback. */
export function useSupplierItems(supplierId: string | undefined) {
  return useQuery({
    queryKey: ["supplier-orders", "items", supplierId ?? ""],
    queryFn: async () => read("supplierOrders.supplierItems", supplierId as string),
    enabled: Boolean(supplierId),
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

export function useUpdateSupplierOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; values: SupplierOrderValues }) =>
      updateSupplierOrder(await getAccessToken(), args.id, args.values),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supplier-orders"] }),
  });
}

export function useSaveSupplierOrderTally() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; values: SupplierOrderTallyValues }) =>
      saveSupplierOrderTally(await getAccessToken(), args.id, args.values),
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
