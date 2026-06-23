"use server";

import { createActionClient } from "@/lib/supabase/server";
import { runQuery } from "@/server/actions/_client";
import { StockEntryType } from "@/lib/enums";
import { stockEntrySchema, type StockEntryValues } from "@/lib/schemas";
import { searchTokens } from "@/lib/search";
import type { ItemWithStock, StockEntry, StockEntryWithSupplier } from "@/types/models";

/** Items with their derived warehouse quantity (Σin − Σout). One item, two screens. */
export async function listItemsWithStock(accessToken: string, search = ""): Promise<ItemWithStock[]> {
  const client = createActionClient(accessToken);

  let iq = client.from("items").select("*").order("name_en").limit(100);
  for (const t of searchTokens(search)) iq = iq.ilike("search_norm", `%${t}%`);
  const { data: items, error } = await iq;
  if (error) throw new Error(error.message);

  const { data: stock, error: e2 } = await client
    .from("warehouse_stock")
    .select("item_id, quantity");
  if (e2) throw new Error(e2.message);

  const qty = new Map((stock ?? []).map((s) => [s.item_id, Number(s.quantity ?? 0)]));
  return (items ?? []).map((i) => ({ ...i, quantity: qty.get(i.id) ?? 0 }));
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
