"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { read } from "@/lib/read-client";
import { getAccessToken } from "@/lib/auth-token";
import { queryKeys } from "@/lib/query-keys";
import type { StockEntryValues } from "@/lib/schemas";
import {
  createStockEntry,
  deleteStockEntry,
  setLatestBuyingPrice,
  updateStockEntry,
} from "@/server/actions/warehouse";

export function useItemsWithStock(search = "") {
  return useQuery({
    queryKey: [...queryKeys.warehouseStock(), search],
    queryFn: async () => read("warehouse.itemsWithStock", search),
  });
}

/** Current warehouse quantity for one item (used by the pricing item detail). */
export function useItemStock(itemId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.itemStock(itemId ?? ""),
    queryFn: async () => read("warehouse.itemStock", itemId as string),
    enabled: Boolean(itemId),
  });
}

export function useStockEntries(itemId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.stockEntries(itemId),
    queryFn: async () => read("warehouse.stockEntries", itemId as string),
    enabled: Boolean(itemId),
  });
}

function useInvalidateStock() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["stock-entries"] });
    void qc.invalidateQueries({ queryKey: ["warehouse-stock"] });
    // Buying-cost changes affect the order-form pricing panel.
    void qc.invalidateQueries({ queryKey: ["item-pricing"] });
  };
}

export function useCreateStockEntry() {
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: async (values: StockEntryValues) => createStockEntry(await getAccessToken(), values),
    onSuccess: invalidate,
  });
}

export function useUpdateStockEntry() {
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: async (args: { id: string; values: StockEntryValues }) =>
      updateStockEntry(await getAccessToken(), args.id, args.values),
    onSuccess: invalidate,
  });
}

export function useDeleteStockEntry() {
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: async (id: string) => deleteStockEntry(await getAccessToken(), id),
    onSuccess: invalidate,
  });
}

/** Correct the current supplier buying price (latest stock-in) without a stock movement. */
export function useSetLatestBuyingPrice() {
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: async (args: { itemId: string; buyingPrice: number; supplierId: string | null }) =>
      setLatestBuyingPrice(await getAccessToken(), args.itemId, args.buyingPrice, args.supplierId),
    onSuccess: invalidate,
  });
}
