"use server";

import { createActionClient } from "@/lib/supabase/server";
import { runQuery } from "@/server/actions/_client";
import { itemSchema, type ItemValues } from "@/lib/schemas";
import { searchTokens } from "@/lib/search";
import type { Item } from "@/types/models";

export async function listItems(accessToken: string, search = ""): Promise<Item[]> {
  const client = createActionClient(accessToken);
  // Same ranked path as the Items list (search_items_ranked): the exact match
  // comes first and the LIMIT keeps the most relevant rows. Word order stays
  // irrelevant (tokens are ANDed); the phrase is used only for ranking.
  const tokens = searchTokens(search);
  const { data, error } = await client.rpc("search_items_ranked", {
    p_tokens: tokens,
    p_query: tokens.join(""),
    p_limit: 50,
  });
  if (error) throw new Error(error.message);

  // The view carries quantity + effective_buying_price on top of the item row.
  // Drop quantity (warehouse-only), and surface the EFFECTIVE cost as buying_price
  // so search shows a figure for legacy items whose own column is null but which
  // have a priced stock-in — matching what the Items list shows.
  return (data ?? []).map((row) => {
    const { quantity, effective_buying_price, ...item } = row;
    void quantity; // view-only column, not part of Item
    return {
      ...item,
      buying_price: effective_buying_price == null ? item.buying_price : Number(effective_buying_price),
    } as Item;
  });
}

export async function createItem(accessToken: string, values: ItemValues): Promise<Item> {
  const data = itemSchema.parse(values);
  return runQuery(accessToken, (c) => c.from("items").insert(data).select("*").single());
}

export async function updateItem(
  accessToken: string,
  id: string,
  values: ItemValues,
): Promise<Item> {
  const data = itemSchema.parse(values);
  return runQuery(accessToken, (c) =>
    c.from("items").update(data).eq("id", id).select("*").single(),
  );
}

export async function deleteItem(accessToken: string, id: string): Promise<null> {
  return runQuery(accessToken, (c) => c.from("items").delete().eq("id", id).then((r) => ({ data: null, error: r.error })));
}

/** Toggle whether an item is managed in the warehouse (stock in/out). Never touches stock entries. */
export async function setWarehouseTracking(
  accessToken: string,
  id: string,
  track: boolean,
): Promise<Item> {
  return runQuery(accessToken, (c) =>
    c.from("items").update({ track_in_warehouse: track }).eq("id", id).select("*").single(),
  );
}

/**
 * Item ids referenced by at least one order line OR supplier-order line — these
 * can't be deleted (both tables FK to items). Union both so the delete guard
 * matches what the DB will actually allow.
 */
export async function listUsedItemIds(accessToken: string): Promise<string[]> {
  const orderRows = await runQuery<{ item_id: string }[]>(accessToken, (c) =>
    c.from("order_items").select("item_id"),
  );
  const supplierRows = await runQuery<{ item_id: string | null }[]>(accessToken, (c) =>
    c.from("supplier_order_items").select("item_id"),
  );
  const ids = new Set<string>(orderRows.map((r) => r.item_id));
  for (const r of supplierRows) if (r.item_id) ids.add(r.item_id);
  return Array.from(ids);
}
