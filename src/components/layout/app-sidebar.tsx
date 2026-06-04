"use client";

import { Logo } from "@/components/layout/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";

/** Desktop sidebar (hidden on mobile — the topbar shows a menu button instead). */
export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <Logo />
      </div>
      <SidebarNav />
    </aside>
  );
}
