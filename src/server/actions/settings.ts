"use server";

import { createActionClient } from "@/lib/supabase/server";
import {
  resolveShortcuts,
  validateShortcutMap,
  type ShortcutMap,
} from "@/lib/nav-shortcuts";

const REMINDER_KEY = "reminder_lead_days";
const NAV_SHORTCUTS_KEY = "nav_shortcuts";

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

/** The effective nav-shortcut map (stored overrides merged onto code defaults). */
export async function getNavShortcuts(accessToken: string): Promise<ShortcutMap> {
  const client = createActionClient(accessToken);
  const { data, error } = await client
    .from("app_settings")
    .select("value")
    .eq("key", NAV_SHORTCUTS_KEY)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return resolveShortcuts((data?.value ?? null) as ShortcutMap | null);
}

/**
 * Persist the nav-shortcut map. Re-validates the fully resolved map server-side
 * so a duplicate/reserved/invalid binding can never be written even if the UI
 * guard is bypassed. RLS additionally restricts writes to super_admin.
 */
export async function setNavShortcuts(
  accessToken: string,
  map: ShortcutMap,
): Promise<ShortcutMap> {
  const resolved = resolveShortcuts(map);
  if (!validateShortcutMap(resolved)) throw new Error("INVALID_SHORTCUTS");
  const client = createActionClient(accessToken);
  const { error } = await client
    .from("app_settings")
    .upsert({ key: NAV_SHORTCUTS_KEY, value: resolved }, { onConflict: "key" });
  if (error) throw new Error(error.message);
  return resolved;
}
