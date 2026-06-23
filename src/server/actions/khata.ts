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
  return runQuery(accessToken, (c) =>
    c.from("khatas").update(data).eq("id", id).select("*").single(),
  );
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
