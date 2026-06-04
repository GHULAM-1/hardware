"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { FullPageLoader } from "@/components/layout/full-page-loader";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, loading } = useAuth();

  React.useEffect(() => {
    if (!loading && !session) router.replace("/login");
  }, [loading, session, router]);

  if (loading || !session) return <FullPageLoader />;

  return <AppShell>{children}</AppShell>;
}
