"use client";

import { useIsSuperAdmin } from "@/providers/auth-provider";
import { DashboardNavGrid } from "@/components/dashboard/dashboard-nav-grid";
import { DashboardInfoCards } from "@/components/dashboard/dashboard-info-cards";
import { DashboardDecor } from "@/components/dashboard/dashboard-decor";

/**
 * The dashboard is the app's launcher. The StatBar (AppShell) stays pinned on
 * top. The route grid is what you land on. The quick-actions + key-figures cards
 * stay pinned at the bottom (super-admin only), side by side and centered.
 */
export default function DashboardPage() {
  const isSuperAdmin = useIsSuperAdmin();

  return (
    <div className="flex h-full flex-col">
      <DashboardDecor />
      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto p-4 pb-6 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <DashboardNavGrid />
        </div>
      </div>

      {/* Pinned bottom cards (super-admin). The floating + button just hovers over
          the corner — no reserved gutter — so the cards get the full width. */}
      {isSuperAdmin && (
        <div className="relative z-10 shrink-0 px-4 pb-3 sm:px-6 sm:pb-4">
          <div className="mx-auto max-w-3xl">
            <DashboardInfoCards />
          </div>
        </div>
      )}
    </div>
  );
}
