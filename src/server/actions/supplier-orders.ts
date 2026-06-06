"use server";

import { createActionClient } from "@/lib/supabase/server";
import { runQuery } from "@/server/actions/_client";
import {
  supplierOrderReceiveSchema,
  supplierOrderSchema,
  type SupplierOrderReceiveValues,
  type SupplierOrderValues,
} from "@/lib/schemas";
import { SupplierOrderStatus } from "@/lib/enums";
import type {
  ItemNamePair,
  SupplierFrequentItem,
  SupplierOrder,
  SupplierOrderDetailView,
  SupplierOrderListView,
} from "@/types/models";

export async function listSupplierOrders(
  accessToken: string,
  search = "",
): Promise<SupplierOrderListView[]> {
  const client = createActionClient(accessToken);
  let q = client
    .from("supplier_orders")
    .select(
      "id, order_no, created_at, status, received_at, suppliers(name), supplier_order_items(items(name_en, name_ur))",
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (search.trim()) q = q.ilike("order_no", `%${search.trim().replace(/[%,]/g, "")}%`);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((o) => {
    const lines = o.supplier_order_items ?? [];
    return {
      id: o.id,
      order_no: o.order_no,
      created_at: o.created_at,
      status: o.status,
      received_at: o.received_at,
      supplier: o.suppliers ?? null,
      item_count: lines.length,
      items: lines.map((li) => li.items).filter((it): it is ItemNamePair => Boolean(it)),
    };
  });
}

/** Recent orders placed with one supplier (for the supplier detail view). */
export async function listSupplierOrdersBySupplier(
  accessToken: string,
  supplierId: string,
): Promise<SupplierOrderListView[]> {
  const client = createActionClient(accessToken);
  const { data, error } = await client
    .from("supplier_orders")
    .select(
      "id, order_no, created_at, status, received_at, suppliers(name), supplier_order_items(items(name_en, name_ur))",
    )
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []).map((o) => {
    const lines = o.supplier_order_items ?? [];
    return {
      id: o.id,
      order_no: o.order_no,
      created_at: o.created_at,
      status: o.status,
      received_at: o.received_at,
      supplier: o.suppliers ?? null,
      item_count: lines.length,
      items: lines.map((li) => li.items).filter((it): it is ItemNamePair => Boolean(it)),
    };
  });
}

/** Items most often ordered from one supplier, ranked by total quantity. */
export async function getFrequentItemsForSupplier(
  accessToken: string,
  supplierId: string,
  limit = 8,
): Promise<SupplierFrequentItem[]> {
  const client = createActionClient(accessToken);
  const { data, error } = await client
    .from("supplier_orders")
    .select("supplier_order_items(item_id, quantity, items(name_en, name_ur))")
    .eq("supplier_id", supplierId);
  if (error) throw new Error(error.message);

  const totals = new Map<string, SupplierFrequentItem>();
  for (const order of data ?? []) {
    for (const li of order.supplier_order_items ?? []) {
      if (!li.items || !li.item_id) continue;
      const qty = Number(li.quantity) || 0;
      const existing = totals.get(li.item_id);
      if (existing) existing.total += qty;
      else totals.set(li.item_id, { item: li.items, total: qty });
    }
  }
  return Array.from(totals.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export async function getSupplierOrder(
  accessToken: string,
  id: string,
): Promise<SupplierOrderDetailView> {
  const client = createActionClient(accessToken);
  const { data, error } = await client
    .from("supplier_orders")
    .select(
      "id, order_no, created_at, status, received_at, note, bill_url, suppliers(name, phone, note), supplier_order_items(quantity, unit, note, items(name_en, name_ur, image_urls))",
    )
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);

  return {
    id: data.id,
    order_no: data.order_no,
    created_at: data.created_at,
    status: data.status,
    received_at: data.received_at,
    note: data.note,
    bill_url: data.bill_url,
    supplier: data.suppliers ?? null,
    lines: (data.supplier_order_items ?? []).map((li) => ({
      quantity: li.quantity,
      unit: li.unit,
      note: li.note,
      item: li.items
        ? {
            name_en: li.items.name_en,
            name_ur: li.items.name_ur,
            // Cover image = first gallery image, if any.
            image_url: li.items.image_urls?.[0] ?? null,
          }
        : null,
    })),
  };
}

/** Insert the order + its items. If items fail, roll back the parent row. */
export async function createSupplierOrder(
  accessToken: string,
  values: SupplierOrderValues,
): Promise<SupplierOrder> {
  const data = supplierOrderSchema.parse(values);
  const client = createActionClient(accessToken);
  const { data: userData } = await client.auth.getUser();

  const { data: order, error } = await client
    .from("supplier_orders")
    .insert({
      supplier_id: data.supplier_id,
      note: data.note,
      created_by: userData.user?.id ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const { error: e2 } = await client.from("supplier_order_items").insert(
    data.lines.map((l) => ({
      supplier_order_id: order.id,
      item_id: l.item_id,
      quantity: l.quantity,
      unit: l.unit,
      note: l.note,
    })),
  );
  if (e2) {
    await client.from("supplier_orders").delete().eq("id", order.id);
    throw new Error(e2.message);
  }
  return order;
}

export async function markSupplierOrderReceived(
  accessToken: string,
  id: string,
  values: SupplierOrderReceiveValues,
): Promise<void> {
  const data = supplierOrderReceiveSchema.parse(values);
  const client = createActionClient(accessToken);
  const { error } = await client
    .from("supplier_orders")
    .update({
      status: SupplierOrderStatus.Received,
      received_at: new Date().toISOString(),
      bill_url: data.bill_url,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** Set/replace/clear the attached bill without touching status or received date. */
export async function updateSupplierOrderBill(
  accessToken: string,
  id: string,
  billUrl: string | null,
): Promise<void> {
  const client = createActionClient(accessToken);
  const { error } = await client.from("supplier_orders").update({ bill_url: billUrl }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteSupplierOrder(accessToken: string, id: string): Promise<null> {
  return runQuery(accessToken, (c) =>
    c.from("supplier_orders").delete().eq("id", id).then((r) => ({ data: null, error: r.error })),
  );
}
