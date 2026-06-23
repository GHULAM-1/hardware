"use server";

import { createActionClient } from "@/lib/supabase/server";
import { orderPaymentSchema, orderSchema, type OrderPaymentValues, type OrderValues } from "@/lib/schemas";
import { PaymentType, StockEntryType } from "@/lib/enums";
import type { Json } from "@/types/database";
import type { Order, OrderListView, OrderReceiptView } from "@/types/models";

export async function listOrders(accessToken: string, search = ""): Promise<OrderListView[]> {
  const client = createActionClient(accessToken);
  let q = client
    .from("orders")
    .select(
      "id, order_no, created_at, total, amount_paid, balance_due, payment_type, status, due_date, customers(name_en, name_ur)",
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (search.trim()) q = q.ilike("order_no", `%${search.trim().replace(/[%,]/g, "")}%`);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((o) => ({
    id: o.id,
    order_no: o.order_no,
    created_at: o.created_at,
    total: o.total,
    amount_paid: o.amount_paid,
    balance_due: o.balance_due,
    payment_type: o.payment_type,
    status: o.status,
    due_date: o.due_date,
    customer: o.customers ?? null,
  }));
}

/** Atomically create order + lines + supplier sourcing + (partial/credit) khata via RPC. */
export async function createOrder(accessToken: string, values: OrderValues): Promise<Order> {
  const data = orderSchema.parse(values);
  const client = createActionClient(accessToken);

  const { data: order, error } = await client.rpc("create_order", {
    p_customer_id: data.customer_id,
    p_payment_type: data.payment_type,
    p_amount_paid: data.payment_type === PaymentType.Partial ? data.amount_paid : 0,
    // p_due_date is nullable in Postgres (null for cash); the generated type is strict.
    p_due_date: (data.payment_type === PaymentType.Cash ? null : (data.due_date ?? null)) as unknown as string,
    p_lines: data.lines as unknown as Json,
    // Staff-only memo; the RPC trims/blanks it to null.
    p_internal_note: (data.internal_note ?? undefined) as unknown as string,
  });
  if (error) throw new Error(error.message);
  return order as unknown as Order;
}

/**
 * Update a partial/credit order's payment (amount paid + due date) and keep the
 * linked Khata in sync (outstanding balance + due date).
 */
export async function updateOrderPayment(
  accessToken: string,
  orderId: string,
  values: OrderPaymentValues,
): Promise<void> {
  const data = orderPaymentSchema.parse(values);
  const client = createActionClient(accessToken);

  const { data: order, error } = await client
    .from("orders")
    .select("total, payment_type")
    .eq("id", orderId)
    .single();
  if (error) throw new Error(error.message);

  // Credit orders carry no upfront payment.
  const paid = order.payment_type === PaymentType.Credit ? 0 : data.amount_paid;

  const { error: e1 } = await client
    .from("orders")
    .update({ amount_paid: paid, due_date: data.due_date })
    .eq("id", orderId);
  if (e1) throw new Error(e1.message);

  const { error: e2 } = await client
    .from("khatas")
    .update({ amount: order.total - paid, due_date: data.due_date })
    .eq("order_id", orderId);
  if (e2) throw new Error(e2.message);
}

/** Full order with lines + customer, for the printable receipt. */
export async function getOrderReceipt(
  accessToken: string,
  orderId: string,
): Promise<OrderReceiptView> {
  const client = createActionClient(accessToken);
  const { data, error } = await client
    .from("orders")
    .select(
      "id, order_no, created_at, total, amount_paid, balance_due, payment_type, due_date, internal_note, customers(name_en, name_ur, phone), order_items(quantity, unit, selling_price, items(name_en, name_ur))",
    )
    .eq("id", orderId)
    .single();
  if (error) throw new Error(error.message);

  return {
    id: data.id,
    order_no: data.order_no,
    created_at: data.created_at,
    total: data.total,
    amount_paid: data.amount_paid,
    balance_due: data.balance_due,
    payment_type: data.payment_type,
    due_date: data.due_date,
    internal_note: data.internal_note,
    customer: data.customers ?? null,
    lines: (data.order_items ?? []).map((li) => ({
      quantity: li.quantity,
      unit: li.unit,
      selling_price: li.selling_price,
      item: li.items ?? null,
    })),
  };
}

/** Latest buying price recorded for an item from a given supplier (read-only hint on order lines). */
export async function getSupplierBuyingPrice(
  accessToken: string,
  itemId: string,
  supplierId: string,
): Promise<number | null> {
  const client = createActionClient(accessToken);
  const { data, error } = await client
    .from("stock_entries")
    .select("buying_price")
    .eq("item_id", itemId)
    .eq("supplier_id", supplierId)
    .eq("type", StockEntryType.In)
    .not("buying_price", "is", null)
    .order("entry_date", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return data?.[0]?.buying_price ?? null;
}
