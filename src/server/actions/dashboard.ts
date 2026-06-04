"use server";

import { createActionClient } from "@/lib/supabase/server";
import { KhataStatus } from "@/lib/enums";

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
