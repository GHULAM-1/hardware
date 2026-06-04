"use server";

import { createActionClient } from "@/lib/supabase/server";

const REMINDER_KEY = "reminder_lead_days";

export async function getReminderLeadDays(accessToken: string): Promise<number> {
  const client = createActionClient(accessToken);
  const { data, error } = await client
    .from("app_settings")
    .select("value")
    .eq("key", REMINDER_KEY)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const value = data?.value;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 7;
}

export async function setReminderLeadDays(accessToken: string, days: number): Promise<number> {
  const client = createActionClient(accessToken);
  const { error } = await client
    .from("app_settings")
    .upsert({ key: REMINDER_KEY, value: days }, { onConflict: "key" });
  if (error) throw new Error(error.message);
  return days;
}
