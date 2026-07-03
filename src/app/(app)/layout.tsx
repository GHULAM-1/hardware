"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import { UserRole } from "@/lib/enums";
import { isAdminAllowedPath } from "@/lib/nav";
import { LockProvider, useLock } from "@/providers/lock-provider";
import { AppShell } from "@/components/layout/app-shell";
import { TabLockScreen } from "@/components/lock/tab-lock-screen";
import { FullPageLoader } from "@/components/layout/full-page-loader";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const { session, profile, loading, signOut } = useAuth();

  // A deactivated account (any role) must not enter the app. The role-based RLS
  // helpers (is_active_user / is_super_admin) all require is_active, so an inactive
  // user would otherwise see a fully-unlocked shell with every read returning zero.
  const inactive = !!profile && !profile.is_active;

  // A read-only admin who is on a restricted page (e.g. typed /orders) is sent
  // back to a page they're allowed to see. Super_admin is never restricted.
  const adminBlocked =
    !!profile && profile.role !== UserRole.SuperAdmin && !isAdminAllowedPath(pathname);

  // Ensures the disable handling (toast + signOut) runs only ONCE — the effect can
  // re-fire on auth-state changes / strict-mode before signOut clears the session.
  const handledInactive = React.useRef(false);

  React.useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (inactive) {
      if (handledInactive.current) return;
      handledInactive.current = true;
      toast.error(t("auth.accountDisabled"), { id: "account-disabled" });
      void signOut();
      router.replace("/login");
      return;
    }
    if (adminBlocked) router.replace("/dashboard");
  }, [loading, session, inactive, adminBlocked, router, signOut, t]);

  if (loading || !session || inactive || adminBlocked) return <FullPageLoader />;

  return (
    <LockProvider>
      <AppShell>
        <LockGate>{children}</LockGate>
      </AppShell>
    </LockProvider>
  );
}

/**
 * Replaces a locked page's content with the unlock prompt (keeping the shell,
 * so the user can navigate elsewhere). Direct-URL entry is covered because this
 * keys off the live pathname, just like the admin guard above.
 */
function LockGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isGated } = useLock();
  return isGated(pathname) ? <TabLockScreen /> : <>{children}</>;
}
