"use client";

import * as React from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { SelectionReader } from "@/components/common/selection-reader";

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
        <main className="flex-1 overflow-y-auto bg-secondary/40 p-4 sm:p-6">{children}</main>
      </div>
      <SelectionReader />
    </div>
  );
}
