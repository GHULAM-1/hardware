"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { LockKeyhole } from "lucide-react";

import { useLock } from "@/providers/lock-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Full-content unlock prompt shown in place of a locked page. The shell (sidebar
 * + topbar) stays, so the user can navigate away instead of being trapped. A
 * correct entry unlocks only this tab for the session (per-tab).
 */
export function TabLockScreen() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { verifyAndUnlock } = useLock();

  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || pending) return;
    setPending(true);
    setError(false);
    try {
      const ok = await verifyAndUnlock(password, pathname);
      if (!ok) {
        setError(true);
        setPassword("");
      }
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-5 rounded-2xl well border border-white/20 p-6 text-center shadow-lg"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
          <LockKeyhole className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold">{t("lock.lockedTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("lock.lockedHint")}</p>
        </div>
        <div className="space-y-2 text-start">
          <Input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            placeholder={t("lock.passwordPlaceholder")}
            aria-invalid={error}
          />
          {error && <p className="text-sm text-destructive">{t("lock.wrongPassword")}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={!password || pending}>
          {t("lock.unlock")}
        </Button>
      </form>
    </div>
  );
}
