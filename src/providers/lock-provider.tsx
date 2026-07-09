"use client";

import * as React from "react";

import { getAccessToken } from "@/lib/auth-token";
import { verifyTabLockPassword } from "@/server/actions/settings";
import { useLockedTabs } from "@/hooks/use-settings";

/** The locked href that gates `pathname` (prefix match), or null if none. */
function matchedLockedHref(pathname: string, lockedTabs: string[]): string | null {
  return (
    lockedTabs.find((href) => pathname === href || pathname.startsWith(`${href}/`)) ?? null
  );
}

type LockValue = {
  /** Hrefs the super_admin has locked. */
  lockedTabs: string[];
  /** Any tab locked at all? */
  hasLock: boolean;
  /** Has this specific locked href been unlocked for the current config this session? */
  isTabUnlocked: (href: string) => boolean;
  /** The locked href that gates this path (prefix match), or null if none. */
  matchedLockedHref: (pathname: string) => string | null;
  /** Is this path gated (locked AND that tab not yet unlocked for the current config)? */
  isGated: (pathname: string) => boolean;
  /** Verify the shared password; on success unlock only the tab that gates `pathname`. */
  verifyAndUnlock: (password: string, pathname: string) => Promise<boolean>;
  /** Re-lock a single tab now — that tab demands the password again. */
  relockTab: (href: string) => void;
};

const LockContext = React.createContext<LockValue | null>(null);

export function useLock(): LockValue {
  const ctx = React.useContext(LockContext);
  if (!ctx) throw new Error("useLock must be used within a LockProvider");
  return ctx;
}

// Each unlock is per-tab (one entry per locked href), and the whole set is keyed
// to the lock config's version: if the config changes (tabs edited, re-locked, new
// password) the version bumps and the stored set no longer matches, so every tab
// re-prompts. Persisted in sessionStorage so a plain refresh doesn't nag.
const UNLOCK_KEY = "tab-lock-unlocked-tabs";

type UnlockState = { v: number; hrefs: string[] };

function readUnlockState(): UnlockState | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(UNLOCK_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as UnlockState;
    if (typeof parsed?.v === "number" && Array.isArray(parsed?.hrefs)) return parsed;
  } catch {
    // Corrupt/legacy value — ignore and treat as no unlocks.
  }
  return null;
}

export function LockProvider({ children }: { children: React.ReactNode }) {
  const { data } = useLockedTabs();
  const lockedTabs = React.useMemo(() => data?.tabs ?? [], [data]);
  const version = data?.version ?? 0;

  const [state, setState] = React.useState<UnlockState | null>(() => readUnlockState());

  // Only unlocks recorded against the CURRENT config version count.
  const unlockedHrefs = React.useMemo(
    () => (state && state.v === version ? state.hrefs : []),
    [state, version],
  );

  const persist = React.useCallback((next: UnlockState) => {
    window.sessionStorage.setItem(UNLOCK_KEY, JSON.stringify(next));
    setState(next);
  }, []);

  const relockTab = React.useCallback(
    (href: string) => {
      const next: UnlockState = {
        v: version,
        hrefs: unlockedHrefs.filter((h) => h !== href),
      };
      persist(next);
    },
    [persist, unlockedHrefs, version],
  );

  const value = React.useMemo<LockValue>(
    () => ({
      lockedTabs,
      hasLock: lockedTabs.length > 0,
      isTabUnlocked: (href: string) => unlockedHrefs.includes(href),
      matchedLockedHref: (pathname: string) => matchedLockedHref(pathname, lockedTabs),
      isGated: (pathname: string) => {
        const href = matchedLockedHref(pathname, lockedTabs);
        return href !== null && !unlockedHrefs.includes(href);
      },
      verifyAndUnlock: async (password: string, pathname: string) => {
        const href = matchedLockedHref(pathname, lockedTabs);
        if (!href) return true;
        const ok = await verifyTabLockPassword(await getAccessToken(), password);
        if (ok) {
          persist({
            v: version,
            hrefs: unlockedHrefs.includes(href) ? unlockedHrefs : [...unlockedHrefs, href],
          });
        }
        return ok;
      },
      relockTab,
    }),
    [lockedTabs, unlockedHrefs, version, persist, relockTab],
  );

  return <LockContext.Provider value={value}>{children}</LockContext.Provider>;
}
