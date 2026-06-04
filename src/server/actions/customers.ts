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

/** Last selling price this customer was charged for a specific item (order form hint). */
export async function getLastItemPriceForCustomer(
  accessToken: string,
  customerId: string,
  itemId: string,
): Promise<number | null> {
  const client = createActionClient(accessToken);
  const { data, error } = await client
    .from("order_items")
    .select("selling_price, orders!inner(customer_id, created_at)")
    .eq("item_id", itemId)
    .eq("orders.customer_id", customerId);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{ selling_price: number; orders: { created_at: string } | null }>;
  if (rows.length === 0) return null;
  rows.sort((a, b) => (b.orders?.created_at ?? "").localeCompare(a.orders?.created_at ?? ""));
  return rows[0].selling_price;
}
