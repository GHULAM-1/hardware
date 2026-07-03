"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { NAV_ITEMS } from "@/lib/nav";
import { useLockedTabs, useSetTabLock } from "@/hooks/use-settings";
import { getAccessToken } from "@/lib/auth-token";
import { verifyTabLockPassword } from "@/server/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Icon3D } from "@/components/ui/icon-3d";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// The dashboard launcher itself can't be locked (it's the way back in).
const LOCKABLE = NAV_ITEMS.filter((i) => i.href !== "/dashboard");

type Step = "auth" | "manage" | "setPassword";

/**
 * Fetches the current locked-tab set, then hands SETTLED data to the inner form
 * so its step/selection state initializes correctly (never off stale, mid-load
 * data — which could otherwise skip the authenticate step).
 */
export function LockConfigDialog({ onClose }: DialogComponentProps) {
  const { data, isLoading } = useLockedTabs();

  if (isLoading || data === undefined) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md">
          <div className="space-y-3 py-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return <LockConfigForm lockedTabs={data.tabs} onClose={onClose} />;
}

function LockConfigForm({
  lockedTabs,
  onClose,
}: {
  lockedTabs: string[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const setTabLock = useSetTabLock();

  // Whether a password already existed when the dialog opened — decides both the
  // starting step (authenticate first) and whether Save needs a new password.
  const hadPassword = React.useRef(lockedTabs.length > 0);

  const [step, setStep] = React.useState<Step>(() =>
    lockedTabs.length > 0 ? "auth" : "manage",
  );
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set(lockedTabs));

  // Auth step
  const [authPassword, setAuthPassword] = React.useState("");
  const [authError, setAuthError] = React.useState(false);
  const [authPending, setAuthPending] = React.useState(false);

  // Set-password step
  const [pw1, setPw1] = React.useState("");
  const [pw2, setPw2] = React.useState("");
  const [pwError, setPwError] = React.useState<string | null>(null);

  function toggle(href: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(href)) next.delete(href);
      else next.add(href);
      return next;
    });
  }

  async function onAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!authPassword || authPending) return;
    setAuthPending(true);
    setAuthError(false);
    try {
      const ok = await verifyTabLockPassword(await getAccessToken(), authPassword);
      if (ok) setStep("manage");
      else {
        setAuthError(true);
        setAuthPassword("");
      }
    } catch {
      setAuthError(true);
    } finally {
      setAuthPending(false);
    }
  }

  async function persist(tabs: string[], password: string | null) {
    try {
      await setTabLock.mutateAsync({ tabs, password });
      toast.success(t("lock.saved"));
      onClose();
    } catch {
      toast.error(t("lock.saveError"));
    }
  }

  function onManageSave() {
    const tabs = LOCKABLE.filter((i) => selected.has(i.href)).map((i) => i.href);
    // Clearing every tab removes the lock (and password) entirely.
    if (tabs.length === 0) {
      void persist([], null);
      return;
    }
    // First-time lock needs a password; editing an existing set keeps it.
    if (hadPassword.current) void persist(tabs, null);
    else setStep("setPassword");
  }

  function onSetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw1.length < 4) {
      setPwError(t("lock.passwordTooShort"));
      return;
    }
    if (pw1 !== pw2) {
      setPwError(t("lock.passwordMismatch"));
      return;
    }
    const tabs = LOCKABLE.filter((i) => selected.has(i.href)).map((i) => i.href);
    void persist(tabs, pw1);
  }

  const saving = setTabLock.isPending;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md">
        {/* Step 1 — authenticate before managing an existing lock. */}
        {step === "auth" && (
          <form onSubmit={onAuth} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t("lock.manageTitle")}</DialogTitle>
              <DialogDescription>{t("lock.authHint")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Input
                type="password"
                autoFocus
                value={authPassword}
                onChange={(e) => {
                  setAuthPassword(e.target.value);
                  setAuthError(false);
                }}
                placeholder={t("lock.passwordPlaceholder")}
                aria-invalid={authError}
              />
              {authError && (
                <p className="text-sm text-destructive">{t("lock.wrongPassword")}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full sm:w-auto" disabled={!authPassword || authPending}>
                {t("common.confirm")}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* Step 2 — pick which tabs are locked. */}
        {step === "manage" && (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t("lock.manageTitle")}</DialogTitle>
              <DialogDescription>{t("lock.manageHint")}</DialogDescription>
            </DialogHeader>
            <ul className="space-y-1">
              {LOCKABLE.map((item) => (
                <li key={item.href}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-secondary">
                    <Icon3D name={item.icon3d} size={28} alt="" />
                    <span className="flex-1 font-medium">{t(item.i18nKey)}</span>
                    <Switch
                      checked={selected.has(item.href)}
                      onCheckedChange={() => toggle(item.href)}
                    />
                  </label>
                </li>
              ))}
            </ul>
            <DialogFooter>
              <Button className="w-full sm:w-auto" onClick={onManageSave} disabled={saving}>
                {selected.size === 0 ? t("lock.removeLock") : t("lock.lock")}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3 — set the password for a first-time lock. */}
        {step === "setPassword" && (
          <form onSubmit={onSetPassword} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t("lock.setPasswordTitle")}</DialogTitle>
              <DialogDescription>{t("lock.setPasswordHint")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Input
                type="password"
                autoFocus
                value={pw1}
                onChange={(e) => {
                  setPw1(e.target.value);
                  setPwError(null);
                }}
                placeholder={t("lock.newPassword")}
              />
              <Input
                type="password"
                value={pw2}
                onChange={(e) => {
                  setPw2(e.target.value);
                  setPwError(null);
                }}
                placeholder={t("lock.confirmPassword")}
              />
              {pwError && <p className="text-sm text-destructive">{pwError}</p>}
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setStep("manage")}
                disabled={saving}
              >
                {t("common.back")}
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={saving}>
                {t("lock.lock")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
