"use client";

import { useTranslation } from "react-i18next";

import { useKhatas, useFulfillKhata } from "@/hooks/use-khata";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { useConfirmDelete } from "@/hooks/use-confirm-delete";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { DialogKey } from "@/lib/dialog-keys";
import { PageHeader } from "@/components/layout/page-header";
import { KhataTable } from "@/components/khata/khata-table";
import { DueSoonStrip } from "@/components/khata/due-soon-strip";
import { Button } from "@/components/ui/button";
import { BellPlus, Plus } from "lucide-react";

export default function KhataPage() {
  const { t } = useTranslation();
  const { openDialog } = useDialogManager();
  const confirmDelete = useConfirmDelete();
  const isSuperAdmin = useIsSuperAdmin();
  const { data: khatas = [], isLoading } = useKhatas();
  const { fulfill, pendingId } = useFulfillKhata();

  // The table's inline "Mark fulfilled" button is a one-way status change, so it
  // gets the same confirm as the one inside the khata detail dialog. This button
  // lives on the page (not inside a dialog), so the shared confirm is safe here.
  const confirmFulfill = (id: string) =>
    confirmDelete({
      title: t("khata.markFulfilledTitle"),
      description: t("khata.markFulfilledConfirm"),
      confirmLabel: t("khata.markFulfilled"),
      destructive: false,
      onConfirm: () => fulfill(id),
    });

  return (
    <div>
      <PageHeader
        title={t("khata.title")}
        actions={
          isSuperAdmin ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => openDialog(DialogKey.ReminderForm, null)}>
                <BellPlus className="me-1 h-4 w-4" />
                {t("khata.newReminder")}
              </Button>
              <Button onClick={() => openDialog(DialogKey.KhataForm, null)}>
                <Plus className="me-1 h-4 w-4" />
                {t("khata.newEntry")}
              </Button>
            </div>
          ) : null
        }
      />
      <DueSoonStrip
        className="mb-6"
        onOpen={(khata) => openDialog(DialogKey.KhataDetail, { khata })}
        onViewReceipt={(orderId) => openDialog(DialogKey.Receipt, { orderId })}
      />
      <KhataTable
        rows={khatas}
        loading={isLoading}
        onMarkFulfilled={confirmFulfill}
        markingId={pendingId}
        onViewReceipt={(orderId) => openDialog(DialogKey.Receipt, { orderId })}
        onRowClick={(khata) => openDialog(DialogKey.KhataDetail, { khata })}
      />
    </div>
  );
}
