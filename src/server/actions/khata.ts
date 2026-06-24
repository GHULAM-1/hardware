"use server";

import { createActionClient } from "@/lib/supabase/server";
import { runQuery } from "@/server/actions/_client";
import { getReminderLeadDays } from "@/server/actions/settings";
import {
  khataSchema,
  khataUpdateSchema,
  reminderSchema,
  type KhataValues,
  type KhataUpdateValues,
  type ReminderValues,
} from "@/lib/schemas";
import { KhataStatus } from "@/lib/enums";
import type { Khata, KhataListView } from "@/types/models";

const SELECT =
  "id, amount, due_date, status, description, created_at, order_id, proof_url, customers(id, name_en, name_ur, phone)";

type RawKhata = Omit<KhataListView, "customer"> & {
  customers: { id: string; name_en: string; name_ur: string | null; phone: string | null } | null;
};

function toView(rows: RawKhata[]): KhataListView[] {
  return rows.map(({ customers, ...rest }) => ({ ...rest, customer: customers }));
}

export async function listKhatas(accessToken: string, status = ""): Promise<KhataListView[]> {
  const client = createActionClient(accessToken);
  let q = client.from("khatas").select(SELECT).order("due_date", { ascending: true });
  if (status) q = q.eq("status", status as KhataStatus);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return toView((data ?? []) as RawKhata[]);
}

/** Pending khatas due within the configured reminder lead time (dashboard). */
export async function getKhataReminders(accessToken: string): Promise<KhataListView[]> {
  const client = createActionClient(accessToken);
  const lead = await getReminderLeadDays(accessToken);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + lead);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const { data, error } = await client
    .from("khatas")
    .select(SELECT)
    .eq("status", KhataStatus.Pending)
    .lte("due_date", cutoffStr)
    .order("due_date", { ascending: true });
  if (error) throw new Error(error.message);
  return toView((data ?? []) as RawKhata[]);
}

export async function createKhata(accessToken: string, values: KhataValues): Promise<Khata> {
  const data = khataSchema.parse(values);
  const client = createActionClient(accessToken);
  const { data: userData } = await client.auth.getUser();
  const { data: row, error } = await client
    .from("khatas")
    .insert({ ...data, status: KhataStatus.Pending, created_by: userData.user?.id ?? null })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return row;
}

/** A manual reminder = a customer-less, money-less khata (note + due date). */
export async function createReminder(accessToken: string, values: ReminderValues): Promise<Khata> {
  const data = reminderSchema.parse(values);
  const client = createActionClient(accessToken);
  const { data: userData } = await client.auth.getUser();
  const { data: row, error } = await client
    .from("khatas")
    .insert({
      customer_id: null,
      amount: 0,
      description: data.description,
      due_date: data.due_date,
      status: KhataStatus.Pending,
      created_by: userData.user?.id ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return row;
}

/** Edit an existing khata or reminder (customer-less rows allowed — customer_id null). */
export async function updateKhata(
  accessToken: string,
  id: string,
  values: KhataUpdateValues,
): Promise<Khata> {
  const data = khataUpdateSchema.parse(values);
  const client = createActionClient(accessToken);

  const { data: row, error } = await client
    .from("khatas")
    .update(data)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  // The order's udhaar and its khata are stored separately — keep the linked
  // order in sync when an order-backed khata is edited: the due date mirrors
  // across, and the khata amount (outstanding) maps to the order's amount_paid
  // (paid = total − outstanding).
  if (row.order_id) {
    const { data: ord, error: oErr } = await client
      .from("orders")
      .select("total")
      .eq("id", row.order_id)
      .single();
    if (oErr) throw new Error(oErr.message);

    const paid = Math.max(0, Math.round((Number(ord.total) - Number(data.amount)) * 100) / 100);
    const { error: e2 } = await client
      .from("orders")
      .update({ due_date: data.due_date, amount_paid: paid })
      .eq("id", row.order_id);
    if (e2) throw new Error(e2.message);
  }
  return row;
}

export async function setKhataStatus(
  accessToken: string,
  id: string,
  status: KhataStatus,
): Promise<Khata> {
  return runQuery(accessToken, (c) =>
    c.from("khatas").update({ status }).eq("id", id).select("*").single(),
  );
}

export async function deleteKhata(accessToken: string, id: string): Promise<null> {
  return runQuery(accessToken, (c) =>
    c.from("khatas").delete().eq("id", id).then((r) => ({ data: null, error: r.error })),
  );
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Sync an order-backed khata's order: amount_paid = total − the khata's outstanding. */
async function syncOrderPaid(
  client: ReturnType<typeof createActionClient>,
  orderId: string,
  outstanding: number,
): Promise<void> {
  const { data: ord, error } = await client
    .from("orders")
    .select("total")
    .eq("id", orderId)
    .single();
  if (error) throw new Error(error.message);
  const paid = Math.max(0, round2(Number(ord.total) - outstanding));
  const { error: e2 } = await client.from("orders").update({ amount_paid: paid }).eq("id", orderId);
  if (e2) throw new Error(e2.message);
}

/**
 * Apply a lump-sum payment from a customer across their pending khatas as a
 * waterfall: oldest DUE DATE first (ties → oldest created). Each entry the money
 * fully covers is marked Fulfilled (its order's balance → 0); the first entry it
 * can't fully cover has its outstanding reduced (stays Pending, order amount_paid
 * bumped). Any excess beyond the total owed is ignored (no credit balance).
 * Returns how many entries were fully settled and any unused remainder.
 */
export async function applyCustomerPayment(
  accessToken: string,
  customerId: string,
  amount: number,
): Promise<{ settled: number; partial: boolean; unused: number }> {
  const client = createActionClient(accessToken);

  const { data: rows, error } = await client
    .from("khatas")
    .select("id, amount, order_id")
    .eq("customer_id", customerId)
    .eq("status", KhataStatus.Pending)
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  let remaining = round2(Number(amount));
  let settled = 0;
  let partial = false;

  for (const k of rows ?? []) {
    if (remaining <= 0) break;
    const owed = Number(k.amount);

    if (remaining >= owed) {
      // Fully settle this entry.
      const { error: e1 } = await client
        .from("khatas")
        .update({ status: KhataStatus.Fulfilled, fulfilled_at: new Date().toISOString() })
        .eq("id", k.id);
      if (e1) throw new Error(e1.message);
      if (k.order_id) await syncOrderPaid(client, k.order_id, 0);
      remaining = round2(remaining - owed);
      settled += 1;
    } else {
      // Partial: knock the paid amount off this entry's outstanding.
      const newAmount = round2(owed - remaining);
      const { error: e2 } = await client.from("khatas").update({ amount: newAmount }).eq("id", k.id);
      if (e2) throw new Error(e2.message);
      if (k.order_id) await syncOrderPaid(client, k.order_id, newAmount);
      remaining = 0;
      partial = true;
    }
  }

  return { settled, partial, unused: Math.max(0, remaining) };
}

/** Mark several khatas fulfilled at once (the "Settle all" action). No-op on []. */
export async function fulfillKhatas(accessToken: string, ids: string[]): Promise<null> {
  if (ids.length === 0) return null;
  return runQuery(accessToken, (c) =>
    c
      .from("khatas")
      .update({ status: KhataStatus.Fulfilled })
      .in("id", ids)
      .then((r) => ({ data: null, error: r.error })),
  );
}
