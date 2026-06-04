"use server";

import { createActionClient } from "@/lib/supabase/server";
import { runQuery } from "@/server/actions/_client";
import { stockEntrySchema, type StockEntryValues } from "@/lib/schemas";
import type { ItemWithStock, StockEntry, StockEntryWithSupplier } from "@/types/models";

/** Items with their derived warehouse quantity (Σin − Σout). One item, two screens. */
export async function listItemsWithStock(accessToken: string, search = ""): Promise<ItemWithStock[]> {
  const client = createActionClient(accessToken);

  let iq = client.from("items").select("*").order("name_en").limit(100);
  if (search.trim()) {
    const q = search.trim().replace(/[%,]/g, "");
    iq = iq.or(`name_en.ilike.%${q}%,name_ur.ilike.%${q}%,sku.ilike.%${q}%`);
  }
  const { data: items, error } = await iq;
  if (error) throw new Error(error.message);

  const { data: stock, error: e2 } = await client
    .from("warehouse_stock")
    .select("item_id, quantity");
  if (e2) throw new Error(e2.message);

  const qty = new Map((stock ?? []).map((s) => [s.item_id, Number(s.quantity ?? 0)]));
  return (items ?? []).map((i) => ({ ...i, quantity: qty.get(i.id) ?? 0 }));
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

export async function deleteStockEntry(accessToken: string, id: string): Promise<null> {
  return runQuery(accessToken, (c) =>
    c.from("stock_entries").delete().eq("id", id).then((r) => ({ data: null, error: r.error })),
  );
}
