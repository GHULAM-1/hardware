"use server";

import { createActionClient } from "@/lib/supabase/server";
import { runQuery } from "@/server/actions/_client";
import { supplierSchema, type SupplierValues } from "@/lib/schemas";
import type { Supplier } from "@/types/models";

export async function listSuppliers(accessToken: string, search = ""): Promise<Supplier[]> {
  return runQuery(accessToken, (c) => {
    let q = c.from("suppliers").select("*").order("name").limit(50);
    if (search.trim()) q = q.ilike("name", `%${search.trim().replace(/[%,]/g, "")}%`);
    return q;
  });
}

export async function createSupplier(
  accessToken: string,
  values: SupplierValues,
): Promise<Supplier> {
  const data = supplierSchema.parse(values);
  return runQuery(accessToken, (c) => c.from("suppliers").insert(data).select("*").single());
}

export async function updateSupplier(
  accessToken: string,
  id: string,
  values: SupplierValues,
): Promise<Supplier> {
  const data = supplierSchema.parse(values);
  return runQuery(accessToken, (c) =>
    c.from("suppliers").update(data).eq("id", id).select("*").single(),
  );
}

/** Distinct suppliers that have supplied a given item (via warehouse stock-in entries). */
export async function listSuppliersForItem(
  accessToken: string,
  itemId: string,
): Promise<Pick<Supplier, "id" | "name">[]> {
  const client = createActionClient(accessToken);
  const { data, error } = await client
    .from("stock_entries")
    .select("supplier_id, suppliers(id, name)")
    .eq("item_id", itemId)
    .eq("type", "in")
    .not("supplier_id", "is", null);
  if (error) throw new Error(error.message);

  const seen = new Map<string, Pick<Supplier, "id" | "name">>();
  for (const row of data ?? []) {
    if (row.suppliers) seen.set(row.suppliers.id, row.suppliers);
  }
  return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function deleteSupplier(accessToken: string, id: string): Promise<null> {
  return runQuery(accessToken, (c) =>
    c.from("suppliers").delete().eq("id", id).then((r) => ({ data: null, error: r.error })),
  );
}
