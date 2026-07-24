"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { StatBar } from "@/components/layout/stat-bar";
import { ActionFab } from "@/components/assistant/action-fab";
import { useNavShortcuts } from "@/hooks/use-nav-shortcuts";
import { useArrowScroll } from "@/hooks/use-arrow-scroll";
import { moduleColorFor } from "@/lib/nav";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "sidebar-collapsed";
const MODULE_CLASSES = [
  "mod-green", "mod-blue", "mod-orange", "mod-purple",
  "mod-red", "mod-teal", "mod-pink", "mod-slate",
];

/**
 * Paint the current module's family onto <html>. It has to be the root element,
 * not the shell div: Radix portals dialogs, sheets, popovers and menus straight
 * into document.body, so anything scoped to the shell would leave every overlay
 * on the default blue while the page behind it wore its own color.
 */
function useModuleTheme(pathname: string) {
  const moduleClass = `mod-${moduleColorFor(pathname)}`;
  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.remove(...MODULE_CLASSES);
    root.classList.add(moduleClass);
    return () => root.classList.remove(moduleClass);
  }, [moduleClass]);
  return moduleClass;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  // Persisted so the collapsed/expanded choice sticks across reloads. AppShell
  // only mounts client-side (after the auth guard), so reading localStorage here
  // is safe and flash-free.
  const pathname = usePathname();
  // Global "Ctrl + letter" launcher shortcuts, active on every app page.
  useNavShortcuts();
  // Arrow / Page / Home / End keys scroll the main content area (the shell is a
  // fixed layout, so the page itself never scrolls) — works on every tab.
  const mainRef = useArrowScroll<HTMLElement>();
  // The dashboard is a launcher: its own tile grid replaces the sidebar (desktop)
  // and it owns its scroll, so the stat-bar stays pinned on top and the info
  // cards stay pinned at the bottom.
  const isDashboard = pathname === "/dashboard";
  // Also applied to the shell itself so the first paint is themed (the <html>
  // effect only lands after hydration).
  const moduleClass = useModuleTheme(pathname);

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
    <div className={cn("bg-app fixed inset-0 flex overflow-hidden", moduleClass)}>
      {!isDashboard && <AppSidebar collapsed={collapsed} onToggle={toggleSidebar} />}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        <StatBar />
        {/* Non-dashboard pages scroll normally; pb clears the floating assistant
            button. The dashboard owns its own scroll (pinned top/bottom zones). */}
        <main
          ref={mainRef}
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
