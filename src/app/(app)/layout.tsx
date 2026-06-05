"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";

import { useAuth } from "@/providers/auth-provider";
import { UserRole } from "@/lib/enums";
import { isAdminAllowedPath } from "@/lib/nav";
import { AppShell } from "@/components/layout/app-shell";
import { FullPageLoader } from "@/components/layout/full-page-loader";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, profile, loading } = useAuth();

  // A read-only admin who is on a restricted page (e.g. typed /orders) is sent
  // back to a page they're allowed to see. Super_admin is never restricted.
  const adminBlocked =
    !!profile && profile.role !== UserRole.SuperAdmin && !isAdminAllowedPath(pathname);

  React.useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (adminBlocked) router.replace("/dashboard");
  }, [loading, session, adminBlocked, router]);

  if (loading || !session || adminBlocked) return <FullPageLoader />;

  return <AppShell>{children}</AppShell>;
}
