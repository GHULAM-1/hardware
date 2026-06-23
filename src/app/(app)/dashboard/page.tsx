"use client";

import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { DialogKey } from "@/lib/dialog-keys";
import { DueSoonStrip } from "@/components/khata/due-soon-strip";
import { DashboardNavGrid } from "@/components/dashboard/dashboard-nav-grid";
import { DashboardInfoCards } from "@/components/dashboard/dashboard-info-cards";
import { DashboardDecor } from "@/components/dashboard/dashboard-decor";

/**
 * The dashboard is the app's launcher. The StatBar (AppShell) stays pinned on
 * top. The route grid comes first so it's what you land on; payments-due-soon
 * follows. The quick-actions + key-figures cards stay pinned at the bottom
 * (super-admin only), side by side and centered.
 */
export default function DashboardPage() {
  const { openDialog } = useDialogManager();
  const isSuperAdmin = useIsSuperAdmin();

  return (
    <div className="flex h-full flex-col">
      <DashboardDecor />
      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto p-4 pb-6 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <DashboardNavGrid />
          {isSuperAdmin && (
            <DueSoonStrip
              beacon
              onOpen={(khata) => openDialog(DialogKey.KhataDetail, { khata })}
              onViewReceipt={(orderId) => openDialog(DialogKey.Receipt, { orderId })}
            />
          )}
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
