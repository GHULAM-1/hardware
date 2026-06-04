"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getAccessToken } from "@/lib/auth-token";
import { queryKeys } from "@/lib/query-keys";
import type { SupplierValues } from "@/lib/schemas";
import {
  createSupplier,
  deleteSupplier,
  listSuppliers,
  listSuppliersForItem,
  updateSupplier,
} from "@/server/actions/suppliers";

export function useSuppliers(search = "") {
  return useQuery({
    queryKey: queryKeys.suppliers(search),
    queryFn: async () => listSuppliers(await getAccessToken(), search),
  });
}

/** Suppliers that have supplied a specific item (for order sourcing). */
export function useItemSuppliers(itemId: string | null) {
  return useQuery({
    queryKey: ["item-suppliers", itemId],
    queryFn: async () => listSuppliersForItem(await getAccessToken(), itemId as string),
    enabled: Boolean(itemId),
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: SupplierValues) => createSupplier(await getAccessToken(), values),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; values: SupplierValues }) =>
      updateSupplier(await getAccessToken(), args.id, args.values),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => deleteSupplier(await getAccessToken(), id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}
