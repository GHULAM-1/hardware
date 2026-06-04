"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getAccessToken } from "@/lib/auth-token";
import { queryKeys } from "@/lib/query-keys";
import type { ItemValues } from "@/lib/schemas";
import { createItem, deleteItem, listItems, updateItem } from "@/server/actions/items";

export function useItems(search = "") {
  return useQuery({
    queryKey: queryKeys.items(search),
    queryFn: async () => listItems(await getAccessToken(), search),
  });
}

// Items are shared by Pricing and Warehouse, so refresh both on any change.
function useInvalidateItems() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["items"] });
    void qc.invalidateQueries({ queryKey: ["warehouse-stock"] });
  };
}

export function useCreateItem() {
  const invalidate = useInvalidateItems();
  return useMutation({
    mutationFn: async (values: ItemValues) => createItem(await getAccessToken(), values),
    onSuccess: invalidate,
  });
}

export function useUpdateItem() {
  const invalidate = useInvalidateItems();
  return useMutation({
    mutationFn: async (args: { id: string; values: ItemValues }) =>
      updateItem(await getAccessToken(), args.id, args.values),
    onSuccess: invalidate,
  });
}

export function useDeleteItem() {
  const invalidate = useInvalidateItems();
  return useMutation({
    mutationFn: async (id: string) => deleteItem(await getAccessToken(), id),
    onSuccess: invalidate,
  });
}
