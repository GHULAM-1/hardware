"use server";

import { createActionClient } from "@/lib/supabase/server";
import { KhataStatus, OrderStatus } from "@/lib/enums";
import { thresholdBase } from "@/lib/units";

export type DashboardStats = {
  items: number;
  customers: number;
  pendingKhata: number;
};

export async function getDashboardStats(accessToken: string): Promise<DashboardStats> {
  const client = createActionClient(accessToken);

  const [items, customers, khata] = await Promise.all([
    client.from("items").select("id", { count: "exact", head: true }),
    client.from("customers").select("id", { count: "exact", head: true }),
    client
      .from("khatas")
      .select("id", { count: "exact", head: true })
      .eq("status", KhataStatus.Pending),
  ]);

  return {
    items: items.count ?? 0,
    customers: customers.count ?? 0,
    pendingKhata: khata.count ?? 0,
  };
}

/** Catalog + stock health — safe for every role (no revenue/customer data). */
export type CatalogSummary = {
  products: number;
  lowStock: number;
  outOfStock: number;
  totalUnits: number;
};

export async function getCatalogSummary(accessToken: string): Promise<CatalogSummary> {
  const client = createActionClient(accessToken);

  const [{ data: items }, { data: stock }] = await Promise.all([
    client.from("items").select("id, track_in_warehouse, low_stock_threshold, base_per_primary"),
    client.from("warehouse_stock").select("item_id, quantity"),
  ]);

  const qty = new Map((stock ?? []).map((s) => [s.item_id, Number(s.quantity ?? 0)]));

  let lowStock = 0;
  let outOfStock = 0;
  let totalUnits = 0;
  // Stock health only applies to warehouse-tracked items; untracked items have
  // no managed stock. Low-stock uses each item's own threshold (null = no flag).
  for (const it of items ?? []) {
    if (!it.track_in_warehouse) continue;
    const q = qty.get(it.id) ?? 0;
    totalUnits += q;
    const tBase = thresholdBase(it);
    if (q <= 0) outOfStock += 1;
    else if (tBase != null && q <= tBase) lowStock += 1;
  }

  return { products: (items ?? []).length, lowStock, outOfStock, totalUnits };
}

/** Money + relationships — super_admin only (read by the dashboard behind a role gate). */
export type FinancialSummary = {
  revenueThisMonth: number;
  ordersThisMonth: number;
  outstanding: number;
  customers: number;
  suppliers: number;
};

export async function getFinancialSummary(accessToken: string): Promise<FinancialSummary> {
  const client = createActionClient(accessToken);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [orders, customers, suppliers, pendingKhatas] = await Promise.all([
    client.from("orders").select("total, status").gte("created_at", monthStart.toISOString()),
    client.from("customers").select("id", { count: "exact", head: true }),
    client.from("suppliers").select("id", { count: "exact", head: true }),
    client.from("khatas").select("amount").eq("status", KhataStatus.Pending),
  ]);

  const completed = (orders.data ?? []).filter((o) => o.status === OrderStatus.Completed);
  const revenueThisMonth = completed.reduce((sum, o) => sum + Number(o.total ?? 0), 0);
  const outstanding = (pendingKhatas.data ?? []).reduce((sum, k) => sum + Number(k.amount ?? 0), 0);

  return {
    revenueThisMonth,
    ordersThisMonth: completed.length,
    outstanding,
    customers: customers.count ?? 0,
    suppliers: suppliers.count ?? 0,
  };
}

/** Today's completed-order sales total + order count (super_admin). */
export type TodayStats = { salesToday: number; ordersToday: number };

export async function getTodayStats(accessToken: string): Promise<TodayStats> {
  const client = createActionClient(accessToken);

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const { data } = await client
    .from("orders")
    .select("total, status")
    .gte("created_at", dayStart.toISOString());

  const completed = (data ?? []).filter((o) => o.status === OrderStatus.Completed);
  return {
    salesToday: completed.reduce((sum, o) => sum + Number(o.total ?? 0), 0),
    ordersToday: completed.length,
  };
}

/** `YYYY-MM` bucket key for a date (local time). */
function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Completed-order revenue per month for the last `months` months (super_admin). */
export type RevenuePoint = { key: string; total: number };

export async function getRevenueTrend(
  accessToken: string,
  months = 6,
): Promise<RevenuePoint[]> {
  const client = createActionClient(accessToken);

  const start = new Date();
  start.setMonth(start.getMonth() - (months - 1));
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const { data } = await client
    .from("orders")
    .select("total, status, created_at")
    .gte("created_at", start.toISOString());

  // Seed every month in range so gaps render as zero bars, not missing.
  const buckets = new Map<string, number>();
  for (let i = 0; i < months; i++) {
    const d = new Date(start);
    d.setMonth(start.getMonth() + i);
    buckets.set(monthKey(d), 0);
  }

  for (const o of data ?? []) {
    if (o.status !== OrderStatus.Completed) continue;
    const k = monthKey(new Date(o.created_at as string));
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + Number(o.total ?? 0));
  }

  return Array.from(buckets, ([key, total]) => ({ key, total }));
}

/** This month's completed-order revenue split by how it was paid (super_admin). */
export type PaymentBreakdown = { cash: number; partial: number; credit: number };

export async function getPaymentBreakdown(accessToken: string): Promise<PaymentBreakdown> {
  const client = createActionClient(accessToken);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data } = await client
    .from("orders")
    .select("total, payment_type, status")
    .gte("created_at", monthStart.toISOString());

  const result: PaymentBreakdown = { cash: 0, partial: 0, credit: 0 };
  for (const o of data ?? []) {
    if (o.status !== OrderStatus.Completed) continue;
    const key = o.payment_type as keyof PaymentBreakdown;
    if (key in result) result[key] += Number(o.total ?? 0);
  }
  return result;
}
