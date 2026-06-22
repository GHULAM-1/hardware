"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { StatBar } from "@/components/layout/stat-bar";
import { ActionFab } from "@/components/assistant/action-fab";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "sidebar-collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  // Persisted so the collapsed/expanded choice sticks across reloads. AppShell
  // only mounts client-side (after the auth guard), so reading localStorage here
  // is safe and flash-free.
  const pathname = usePathname();
  // The dashboard is a launcher: its own tile grid replaces the sidebar (desktop)
  // and it owns its scroll, so the stat-bar stays pinned on top and the info
  // cards stay pinned at the bottom.
  const isDashboard = pathname === "/dashboard";

  const [collapsed, setCollapsed] = React.useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  });

  const toggleSidebar = React.useCallback(() => {
    setCollapsed((v) => {
      const next = !v;
      window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  return (
    <div className="bg-app fixed inset-0 flex overflow-hidden">
      {!isDashboard && <AppSidebar collapsed={collapsed} onToggle={toggleSidebar} />}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        <StatBar />
        {/* Non-dashboard pages scroll normally; pb clears the floating assistant
            button. The dashboard owns its own scroll (pinned top/bottom zones). */}
        <main
          className={cn(
            "min-h-0 flex-1",
            isDashboard ? "overflow-hidden" : "overflow-y-auto p-4 pb-24 sm:p-6 sm:pb-24",
          )}
        >
          {children}
        </main>
      </div>
      <ActionFab />
    </div>
  );
}
