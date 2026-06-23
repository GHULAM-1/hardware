"use server";

import { createActionClient } from "@/lib/supabase/server";
import { runQuery } from "@/server/actions/_client";
import {
  supplierOrderSchema,
  supplierOrderTallySchema,
  type SupplierOrderTallyValues,
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

/** Distinct, ordered supplier names from a set of lines (skips unassigned). */
function supplierNames(
  lines: { suppliers?: { name: string } | null }[],
): string[] {
  const seen = new Set<string>();
  for (const li of lines) {
    const name = li.suppliers?.name;
    if (name) seen.add(name);
  }
  return Array.from(seen);
}

/**
 * Derive an order's status from its lines:
 *   pending  → no line tallied yet (every received_quantity is null)
 *   received → every line received in full (received ≥ ordered)
 *   partial  → anything in between (some tallied, not all complete)
 */
function deriveStatus(
  lines: { quantity: number; received_quantity: number | null }[],
): SupplierOrderStatus {
  if (!lines.length) return SupplierOrderStatus.Pending;
  const anyTallied = lines.some((l) => l.received_quantity != null);
  if (!anyTallied) return SupplierOrderStatus.Pending;
  const allComplete = lines.every(
    (l) => l.received_quantity != null && Number(l.received_quantity) >= Number(l.quantity),
  );
  return allComplete ? SupplierOrderStatus.Received : SupplierOrderStatus.Partial;
}

export async function listSupplierOrders(
  accessToken: string,
  search = "",
): Promise<SupplierOrderListView[]> {
  const client = createActionClient(accessToken);
  let q = client
    .from("supplier_orders")
    .select(
      "id, order_no, created_at, status, received_at, supplier_order_items(items(name_en, name_ur), suppliers(name))",
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
      suppliers: supplierNames(lines),
      item_count: lines.length,
      items: lines.map((li) => li.items).filter((it): it is ItemNamePair => Boolean(it)),
    };
  });
}

/** Recent orders that contain at least one line for this supplier. */
export async function listSupplierOrdersBySupplier(
  accessToken: string,
  supplierId: string,
): Promise<SupplierOrderListView[]> {
  const client = createActionClient(accessToken);
  const { data, error } = await client
    .from("supplier_orders")
    .select(
      "id, order_no, created_at, status, received_at, supplier_order_items!inner(supplier_id, items(name_en, name_ur), suppliers(name))",
    )
    .eq("supplier_order_items.supplier_id", supplierId)
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
      suppliers: supplierNames(lines),
      item_count: lines.length,
      items: lines.map((li) => li.items).filter((it): it is ItemNamePair => Boolean(it)),
    };
  });
}

/** Items most often ordered FROM one supplier (by the line's supplier), by total qty. */
export async function getFrequentItemsForSupplier(
  accessToken: string,
  supplierId: string,
  limit = 8,
): Promise<SupplierFrequentItem[]> {
  const client = createActionClient(accessToken);
  const { data, error } = await client
    .from("supplier_order_items")
    .select("item_id, quantity, items(name_en, name_ur)")
    .eq("supplier_id", supplierId);
  if (error) throw new Error(error.message);

  const totals = new Map<string, SupplierFrequentItem>();
  for (const li of data ?? []) {
    if (!li.items || !li.item_id) continue;
    const qty = Number(li.quantity) || 0;
    const existing = totals.get(li.item_id);
    if (existing) existing.total += qty;
    else totals.set(li.item_id, { item: li.items, total: qty });
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
      "id, order_no, created_at, status, received_at, note, bill_url, supplier_order_items(id, item_id, quantity, received_quantity, unit, note, supplier_id, suppliers(id, name), items(name_en, name_ur, image_urls))",
    )
    .eq("id", id)
    .order("created_at", { ascending: true, referencedTable: "supplier_order_items" })
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
    lines: (data.supplier_order_items ?? []).map((li) => ({
      id: li.id,
      item_id: li.item_id,
      quantity: li.quantity,
      received_quantity: li.received_quantity,
      unit: li.unit,
      note: li.note,
      supplier: li.suppliers ? { id: li.suppliers.id, name: li.suppliers.name } : null,
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

/** Insert the order + its (per-supplier) lines. If items fail, roll back the parent. */
export async function createSupplierOrder(
  accessToken: string,
  values: SupplierOrderValues,
): Promise<SupplierOrder> {
  const data = supplierOrderSchema.parse(values);
  const client = createActionClient(accessToken);
  const { data: userData } = await client.auth.getUser();

  const { data: order, error } = await client
    .from("supplier_orders")
    .insert({ note: data.note, created_by: userData.user?.id ?? null })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const { error: e2 } = await client.from("supplier_order_items").insert(
    data.lines.map((l) => ({
      supplier_order_id: order.id,
      item_id: l.item_id,
      supplier_id: l.supplier_id,
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

/**
 * Edit an existing order's lines + note. Kept lines (those with an id) are patched
 * in place so their already-tallied received_quantity survives; removed lines are
 * deleted, new lines inserted. Status is recomputed (a quantity change can flip
 * complete ↔ partial). Editable at ANY status.
 */
export async function updateSupplierOrder(
  accessToken: string,
  id: string,
  values: SupplierOrderValues,
): Promise<void> {
  const data = supplierOrderSchema.parse(values);
  const client = createActionClient(accessToken);

  const { data: existing, error: e0 } = await client
    .from("supplier_order_items")
    .select("id")
    .eq("supplier_order_id", id);
  if (e0) throw new Error(e0.message);
  const existingIds = new Set((existing ?? []).map((r) => r.id));
  const keptIds = new Set(data.lines.map((l) => l.id).filter((x): x is string => Boolean(x)));

  const toDelete = [...existingIds].filter((x) => !keptIds.has(x));
  if (toDelete.length) {
    const { error } = await client.from("supplier_order_items").delete().in("id", toDelete);
    if (error) throw new Error(error.message);
  }

  for (const l of data.lines) {
    if (l.id && existingIds.has(l.id)) {
      const { error } = await client
        .from("supplier_order_items")
        .update({
          item_id: l.item_id,
          supplier_id: l.supplier_id,
          quantity: l.quantity,
          unit: l.unit,
          note: l.note,
        })
        .eq("id", l.id);
      if (error) throw new Error(error.message);
    }
  }

  const newLines = data.lines.filter((l) => !l.id);
  if (newLines.length) {
    const { error } = await client.from("supplier_order_items").insert(
      newLines.map((l) => ({
        supplier_order_id: id,
        item_id: l.item_id,
        supplier_id: l.supplier_id,
        quantity: l.quantity,
        unit: l.unit,
        note: l.note,
      })),
    );
    if (error) throw new Error(error.message);
  }

  const { data: lines, error: e3 } = await client
    .from("supplier_order_items")
    .select("quantity, received_quantity")
    .eq("supplier_order_id", id);
  if (e3) throw new Error(e3.message);
  const status = deriveStatus(lines ?? []);

  const { error: e4 } = await client
    .from("supplier_orders")
    .update({
      note: data.note,
      status,
      received_at: status === SupplierOrderStatus.Received ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (e4) throw new Error(e4.message);
}

/**
 * Save the manual receiving tally: write each line's received_quantity, optionally
 * attach a bill, then recompute the order's status. Stock is NOT touched — the
 * owner adds the received quantities into the warehouse himself.
 */
export async function saveSupplierOrderTally(
  accessToken: string,
  id: string,
  values: SupplierOrderTallyValues,
): Promise<void> {
  const data = supplierOrderTallySchema.parse(values);
  const client = createActionClient(accessToken);

  for (const e of data.entries) {
    const { error } = await client
      .from("supplier_order_items")
      .update({ received_quantity: e.received_quantity })
      .eq("id", e.id)
      .eq("supplier_order_id", id);
    if (error) throw new Error(error.message);
  }

  const { data: lines, error: e2 } = await client
    .from("supplier_order_items")
    .select("quantity, received_quantity")
    .eq("supplier_order_id", id);
  if (e2) throw new Error(e2.message);
  const status = deriveStatus(lines ?? []);

  const patch: { status: SupplierOrderStatus; received_at: string | null; bill_url?: string } = {
    status,
    received_at: status === SupplierOrderStatus.Received ? new Date().toISOString() : null,
  };
  // Only set the bill when one was provided — removal/replace goes through
  // updateSupplierOrderBill so we never clobber an existing bill with null here.
  if (data.bill_url) patch.bill_url = data.bill_url;

  const { error: e3 } = await client.from("supplier_orders").update(patch).eq("id", id);
  if (e3) throw new Error(e3.message);
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
