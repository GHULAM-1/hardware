"use client";

import * as React from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { ActionFab } from "@/components/assistant/action-fab";

const COLLAPSE_KEY = "sidebar-collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  // Persisted so the collapsed/expanded choice sticks across reloads. AppShell
  // only mounts client-side (after the auth guard), so reading localStorage here
  // is safe and flash-free.
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
    <div className="fixed inset-0 flex overflow-hidden">
      <AppSidebar collapsed={collapsed} onToggle={toggleSidebar} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        {/* pb clears the floating assistant button so it never covers content. */}
        <main className="flex-1 overflow-y-auto bg-secondary/40 p-4 pb-24 sm:p-6 sm:pb-24">
          {children}
        </main>
      </div>
      <ActionFab />
    </div>
  );
}
