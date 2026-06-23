"use server";

import { createActionClient } from "@/lib/supabase/server";
import { runQuery } from "@/server/actions/_client";
import { customerSchema, type CustomerValues } from "@/lib/schemas";
import type { Customer, CustomerOrderView, LastPurchaseView } from "@/types/models";

export async function listCustomers(accessToken: string, search = ""): Promise<Customer[]> {
  return runQuery(accessToken, (c) => {
    let q = c.from("customers").select("*").order("name_en").limit(50);
    if (search.trim()) {
      const s = search.trim().replace(/[%,]/g, "");
      q = q.or(`name_en.ilike.%${s}%,name_ur.ilike.%${s}%,phone.ilike.%${s}%`);
    }
    return q;
  });
}

/** Fetch one customer by id (used to open the profile dialog from the assistant). */
export async function getCustomer(accessToken: string, id: string): Promise<Customer> {
  return runQuery(accessToken, (c) => c.from("customers").select("*").eq("id", id).single());
}

export async function createCustomer(
  accessToken: string,
  values: CustomerValues,
): Promise<Customer> {
  const data = customerSchema.parse(values);
  return runQuery(accessToken, (c) => c.from("customers").insert(data).select("*").single());
}

export async function updateCustomer(
  accessToken: string,
  id: string,
  values: CustomerValues,
): Promise<Customer> {
  const data = customerSchema.parse(values);
  return runQuery(accessToken, (c) =>
    c.from("customers").update(data).eq("id", id).select("*").single(),
  );
}

export async function deleteCustomer(accessToken: string, id: string): Promise<null> {
  return runQuery(accessToken, (c) =>
    c.from("customers").delete().eq("id", id).then((r) => ({ data: null, error: r.error })),
  );
}

/** Customer ids referenced by an order or a khata — these can't be deleted (FK). */
export async function listUsedCustomerIds(accessToken: string): Promise<string[]> {
  const client = createActionClient(accessToken);
  const [orders, khatas] = await Promise.all([
    client.from("orders").select("customer_id"),
    client.from("khatas").select("customer_id").not("customer_id", "is", null),
  ]);
  if (orders.error) throw new Error(orders.error.message);
  if (khatas.error) throw new Error(khatas.error.message);

  const ids = new Set<string>();
  for (const r of orders.data ?? []) if (r.customer_id) ids.add(r.customer_id);
  for (const r of khatas.data ?? []) if (r.customer_id) ids.add(r.customer_id);
  return Array.from(ids);
}

/** Full order history for a customer profile. */
export async function getCustomerOrders(
  accessToken: string,
  customerId: string,
): Promise<CustomerOrderView[]> {
  const client = createActionClient(accessToken);
  const { data, error } = await client
    .from("orders")
    .select("id, order_no, created_at, total, payment_type, status, order_items(quantity, unit, selling_price, items(name_en, name_ur))")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((o) => ({
    id: o.id,
    order_no: o.order_no,
    created_at: o.created_at,
    total: o.total,
    payment_type: o.payment_type,
    status: o.status,
    lines: (o.order_items ?? []).map((li) => ({
      quantity: li.quantity,
      unit: li.unit,
      selling_price: li.selling_price,
      item: li.items ?? null,
    })),
  }));
}

/** Most recent item this customer bought + the price charged. */
export async function getLastPurchase(
  accessToken: string,
  customerId: string,
): Promise<LastPurchaseView> {
  const client = createActionClient(accessToken);
  const { data, error } = await client
    .from("orders")
    .select("created_at, order_items(selling_price, items(name_en, name_ur))")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);

  const line = data?.[0]?.order_items?.[0];
  if (!line || !line.items) return null;
  return { item: line.items, price: line.selling_price };
}

/**
 * Pricing context for one (customer, item) shown on an order line:
 *  - what this customer was last sold this item for (+ when),
 *  - the buying cost borne on that historical sale (its sourcing snapshot),
 *  - the current buying cost (latest stock-in price for the item).
 * Cost figures are surfaced to super-admins only (UI gates them).
 */
export type ItemPricingContext = {
  lastSoldPrice: number | null;
  lastSoldAt: string | null;
  lastCostAtSale: number | null;
  currentCost: number | null;
};

export async function getItemPricingForCustomer(
  accessToken: string,
  customerId: string,
  itemId: string,
): Promise<ItemPricingContext> {
  const client = createActionClient(accessToken);

  // Most recent line where this customer bought this item. cost_at_sale is the
  // supplier buying price snapshotted at sale time (null for pre-snapshot orders).
  const { data, error } = await client
    .from("order_items")
    .select("selling_price, cost_at_sale, orders!inner(customer_id, created_at)")
    .eq("item_id", itemId)
    .eq("orders.customer_id", customerId);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{
    selling_price: number;
    cost_at_sale: number | null;
    orders: { created_at: string } | null;
  }>;
  rows.sort((a, b) => (b.orders?.created_at ?? "").localeCompare(a.orders?.created_at ?? ""));
  const last = rows[0] ?? null;

  // Current supplier buying price = latest stock-in with a price.
  const { data: cost, error: costErr } = await client
    .from("stock_entries")
    .select("buying_price")
    .eq("item_id", itemId)
    .eq("type", "in")
    .not("buying_price", "is", null)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);
  if (costErr) throw new Error(costErr.message);

  return {
    lastSoldPrice: last?.selling_price ?? null,
    lastSoldAt: last?.orders?.created_at ?? null,
    // Frozen supplier cost from the time of that sale (not recomputed).
    lastCostAtSale: last?.cost_at_sale ?? null,
    // What it costs from the supplier now.
    currentCost: cost?.[0]?.buying_price ?? null,
  };
}
