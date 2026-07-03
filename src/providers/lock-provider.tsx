"use client";

import * as React from "react";

import { getAccessToken } from "@/lib/auth-token";
import { verifyTabLockPassword } from "@/server/actions/settings";
import { useLockedTabs } from "@/hooks/use-settings";

/** True when `pathname` sits under one of the locked hrefs. */
function matchesLocked(pathname: string, lockedTabs: string[]): boolean {
  return lockedTabs.some((href) => pathname === href || pathname.startsWith(`${href}/`));
}

type LockValue = {
  /** Hrefs the super_admin has locked. */
  lockedTabs: string[];
  /** Any tab locked at all? */
  hasLock: boolean;
  /** Is the app currently unlocked for this session? */
  unlocked: boolean;
  /** Is this path gated (locked AND not yet unlocked for the current config)? */
  isGated: (pathname: string) => boolean;
  /** Verify the shared password; on success unlock the whole app for the session. */
  verifyAndUnlock: (password: string) => Promise<boolean>;
  /** Re-lock now (drop the session unlock) — locked tabs demand the password again. */
  relock: () => void;
};

const LockContext = React.createContext<LockValue | null>(null);

export function useLock(): LockValue {
  const ctx = React.useContext(LockContext);
  if (!ctx) throw new Error("useLock must be used within a LockProvider");
  return ctx;
}

// One unlock covers the whole app (app-wide password) and lasts for the browser
// session. It's keyed to the lock config's version: if the config changes
// (tabs edited, re-locked, new password) the version bumps and this stale unlock
// no longer matches, so the gate re-prompts. Persisted in sessionStorage so a
// plain refresh doesn't nag.
const UNLOCK_KEY = "tab-lock-unlocked-version";

export function LockProvider({ children }: { children: React.ReactNode }) {
  const { data } = useLockedTabs();
  const lockedTabs = React.useMemo(() => data?.tabs ?? [], [data]);
  const version = data?.version ?? 0;

  const [unlockedVersion, setUnlockedVersion] = React.useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem(UNLOCK_KEY);
    return raw === null ? null : Number(raw);
  });

  // Unlocked only when the unlocked version matches the CURRENT config version.
  const unlocked = unlockedVersion !== null && unlockedVersion === version;

  const relock = React.useCallback(() => {
    window.sessionStorage.removeItem(UNLOCK_KEY);
    setUnlockedVersion(null);
  }, []);

  const value = React.useMemo<LockValue>(
    () => ({
      lockedTabs,
      hasLock: lockedTabs.length > 0,
      unlocked,
      isGated: (pathname: string) => !unlocked && matchesLocked(pathname, lockedTabs),
      verifyAndUnlock: async (password: string) => {
        const ok = await verifyTabLockPassword(await getAccessToken(), password);
        if (ok) {
          window.sessionStorage.setItem(UNLOCK_KEY, String(version));
          setUnlockedVersion(version);
        }
        return ok;
      },
      relock,
    }),
    [lockedTabs, unlocked, version, relock],
  );

  return <LockContext.Provider value={value}>{children}</LockContext.Provider>;
}
