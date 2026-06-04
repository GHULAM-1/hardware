"use server";

import { runQuery } from "@/server/actions/_client";
import { itemSchema, type ItemValues } from "@/lib/schemas";
import type { Item } from "@/types/models";

function searchFilter(query: string) {
  const q = query.replace(/[%,]/g, "");
  return `name_en.ilike.%${q}%,name_ur.ilike.%${q}%,sku.ilike.%${q}%`;
}

export async function listItems(accessToken: string, search = ""): Promise<Item[]> {
  return runQuery(accessToken, (c) => {
    let q = c.from("items").select("*").order("created_at", { ascending: false }).limit(50);
    if (search.trim()) q = q.or(searchFilter(search.trim()));
    return q;
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

/** Item ids referenced by at least one order line — these can't be deleted (FK). */
export async function listUsedItemIds(accessToken: string): Promise<string[]> {
  const rows = await runQuery<{ item_id: string }[]>(accessToken, (c) =>
    c.from("order_items").select("item_id"),
  );
  return Array.from(new Set(rows.map((r) => r.item_id)));
}
