"use server";

import { createActionClient } from "@/lib/supabase/server";
import { runQuery } from "@/server/actions/_client";
import { StockEntryType } from "@/lib/enums";
import { stockEntrySchema, type StockEntryValues } from "@/lib/schemas";
import { searchTokens } from "@/lib/search";
import type { ItemWithStock, StockEntry, StockEntryWithSupplier } from "@/types/models";

/**
 * Items with their derived warehouse quantity (Σin − Σout) and effective cost.
 * One item, two screens.
 *
 * Reads the `items_with_stock` view so this is a SINGLE round trip. It used to be
 * three sequential queries stitched together in JS, which cost ~750ms of pure
 * network latency to render a handful of rows.
 */
// Both the Items and Warehouse lists page through this result CLIENT-side (the
// Warehouse further filters to tracked items after fetching), so this one call
// must return the whole catalog, not a screen's worth. A single hardware shop's
// catalog is bounded; this ceiling sits far above any realistic count so nothing
// is silently hidden the way the old 100-row cap hid items 101+.
// Not exported: a "use server" module may only export async functions.
const ITEMS_FETCH_LIMIT = 5000;

export async function listItemsWithStock(accessToken: string, search = ""): Promise<ItemWithStock[]> {
  const client = createActionClient(accessToken);

  // Rank in the DB (search_items_ranked) so the exact match floats to the top and
  // the LIMIT keeps the most RELEVANT rows, not just the newest. Ordering by
  // created_at here used to bury the exact item under every near-name. An empty
  // search stays newest-first.
  const tokens = searchTokens(search);
  const { data, error } = await client.rpc("search_items_ranked", {
    p_tokens: tokens,
    p_query: tokens.join(""),
    p_limit: ITEMS_FETCH_LIMIT,
  });
  if (error) throw new Error(error.message);

  return (data ?? []).map(({ quantity, effective_buying_price, ...item }) => ({
    ...item,
    quantity: Number(quantity ?? 0),
    buying_price: effective_buying_price == null ? null : Number(effective_buying_price),
  })) as ItemWithStock[];
}

/** Derived warehouse quantity (Σin − Σout) for a single item. */
export async function getItemStock(accessToken: string, itemId: string): Promise<number> {
  const rows = await runQuery<{ quantity: number | null }[]>(accessToken, (c) =>
    c.from("warehouse_stock").select("quantity").eq("item_id", itemId),
  );
  return Number(rows[0]?.quantity ?? 0);
}

export async function listStockEntries(
  accessToken: string,
  itemId: string,
): Promise<StockEntryWithSupplier[]> {
  return runQuery(accessToken, (c) =>
    c
      .from("stock_entries")
      .select("*, suppliers(id, name)")
      .eq("item_id", itemId)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false }),
  );
}

export async function createStockEntry(
  accessToken: string,
  values: StockEntryValues,
): Promise<StockEntry> {
  const data = stockEntrySchema.parse(values);
  const client = createActionClient(accessToken);
  const { data: userData } = await client.auth.getUser();

  const { data: row, error } = await client
    .from("stock_entries")
    .insert({ ...data, created_by: userData.user?.id ?? null })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  // A priced purchase is the newest cost we know about, so promote it to the
  // item's current cost. The entry keeps its own price as purchase history.
  if (data.type === StockEntryType.In && data.buying_price != null) {
    const { error: e2 } = await client
      .from("items")
      .update({ buying_price: data.buying_price })
      .eq("id", data.item_id);
    if (e2) throw new Error(e2.message);
  }
  return row;
}

export async function updateStockEntry(
  accessToken: string,
  id: string,
  values: StockEntryValues,
): Promise<StockEntry> {
  const data = stockEntrySchema.parse(values);
  return runQuery(accessToken, (c) =>
    c.from("stock_entries").update(data).eq("id", id).select("*").single(),
  );
}

/**
 * Update the buying price (and supplier) on the item's most recent stock-in
 * entry. Lets the admin correct the current supplier cost from the edit-item
 * dialog without recording a stock movement. No-op if the item has no stock-in.
 */
export async function setLatestBuyingPrice(
  accessToken: string,
  itemId: string,
  buyingPrice: number,
  supplierId: string | null,
): Promise<void> {
  const client = createActionClient(accessToken);
  const { data: latest, error } = await client
    .from("stock_entries")
    .select("id")
    .eq("item_id", itemId)
    .eq("type", StockEntryType.In)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const id = latest?.[0]?.id;
  if (!id) return;

  const { error: e2 } = await client
    .from("stock_entries")
    .update({ buying_price: buyingPrice, supplier_id: supplierId })
    .eq("id", id);
  if (e2) throw new Error(e2.message);
}

export async function deleteStockEntry(accessToken: string, id: string): Promise<null> {
  return runQuery(accessToken, (c) =>
    c.from("stock_entries").delete().eq("id", id).then((r) => ({ data: null, error: r.error })),
  );
}
