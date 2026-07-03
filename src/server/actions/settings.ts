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

/* ------------------------------------------------------------------ */
/* Tab lock — password-gated nav tabs (one app-wide shared password).   */
/* The bcrypt hash lives only in the DB; these RPCs never return it.    */
/* ------------------------------------------------------------------ */

/** Locked hrefs + a version stamp (bumps on every change, so a prior unlock can
 * be invalidated when the lock config changes). */
export type LockConfig = { tabs: string[]; version: number };

/** The current lock config (empty tabs when nothing is locked). */
export async function getLockedTabs(accessToken: string): Promise<LockConfig> {
  const client = createActionClient(accessToken);
  const { data, error } = await client.rpc("get_locked_tabs");
  if (error) throw new Error(error.message);
  const obj = (data ?? {}) as { tabs?: unknown; version?: unknown };
  return {
    tabs: Array.isArray(obj.tabs) ? (obj.tabs as string[]) : [],
    version: typeof obj.version === "number" ? obj.version : 0,
  };
}

/** True when `password` matches the shared lock password (or none is set). */
export async function verifyTabLockPassword(
  accessToken: string,
  password: string,
): Promise<boolean> {
  const client = createActionClient(accessToken);
  const { data, error } = await client.rpc("verify_tab_lock_password", {
    p_password: password,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

/**
 * Persist the locked tabs + password (super_admin only; enforced in the RPC).
 * An empty `tabs` list clears the lock and password. A null `password` with a
 * non-empty list keeps the existing password (editing the set after auth).
 */
export async function setTabLock(
  accessToken: string,
  tabs: string[],
  password: string | null,
): Promise<string[]> {
  const client = createActionClient(accessToken);
  const { error } = await client.rpc("set_tab_lock", {
    p_tabs: tabs,
    p_password: password,
  });
  if (error) throw new Error(error.message);
  return tabs;
}
