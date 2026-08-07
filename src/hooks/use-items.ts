"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { read } from "@/lib/read-client";
import { getAccessToken } from "@/lib/auth-token";
import { queryKeys } from "@/lib/query-keys";
import { useDebounce } from "@/hooks/use-debounce";
import type { ItemValues } from "@/lib/schemas";
import type { Item } from "@/types/models";
import {
  createItem,
  deleteItem,
  setWarehouseTracking,
  updateItem,
} from "@/server/actions/items";

export function useItems(search = "") {
  return useQuery({
    queryKey: queryKeys.items(search),
    queryFn: async () => read("items.list", search),
  });
}

/** Case/space-insensitive name key — must mirror the DB's lower(btrim(name_en)). */
const nameKey = (s: string) => s.trim().toLowerCase();

/**
 * Live "does this item name already exist?" helper, shared by the name field
 * (to show suggestions + an inline warning) and the item dialogs (to block
 * submit). Both call it with the same value, so React Query serves one shared,
 * debounced request from cache.
 *
 * `suggestions` are existing items whose name matches what's typed so far — the
 * autocomplete list. `isDuplicate` is true only on an EXACT name clash (case/
 * space-insensitive), excluding the item being edited. The DB unique index is
 * the real gate; this just makes the clash visible before submit.
 */
export function useItemNameSuggestions(name: string, excludeId?: string) {
  const debounced = useDebounce(name.trim(), 250);
  const enabled = debounced.length >= 2;

  const query = useQuery({
    queryKey: queryKeys.items(debounced),
    queryFn: async () => read("items.list", debounced),
    enabled,
  });

  const suggestions = React.useMemo(
    () => (query.data ?? []).filter((i): i is Item => i.id !== excludeId),
    [query.data, excludeId],
  );

  // Compare against the live value (not the debounced one) so the warning tracks
  // the field exactly once the matching row is in cache.
  const key = nameKey(name);
  const isDuplicate = enabled && key.length >= 2 && suggestions.some((i) => nameKey(i.name_en) === key);

  return { suggestions, isDuplicate, loading: query.isFetching };
}

/** Set of item ids that appear in orders (delete is blocked for these). */
export function useUsedItemIds() {
  return useQuery({
    queryKey: queryKeys.usedItemIds(),
    queryFn: async () => read("items.usedIds"),
    select: (ids) => new Set(ids),
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

/** Toggle warehouse tracking for an item (Items ⇄ Warehouse). */
export function useSetWarehouseTracking() {
  const invalidate = useInvalidateItems();
  return useMutation({
    mutationFn: async (args: { id: string; track: boolean }) =>
      setWarehouseTracking(await getAccessToken(), args.id, args.track),
    onSuccess: invalidate,
  });
}
