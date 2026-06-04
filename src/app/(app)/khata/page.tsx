"use client";

import { useTranslation } from "react-i18next";

import { useKhatas, useSetKhataStatus } from "@/hooks/use-khata";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { DialogKey } from "@/lib/dialog-keys";
import { KhataStatus } from "@/lib/enums";
import { PageHeader } from "@/components/layout/page-header";
import { KhataTable } from "@/components/khata/khata-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function KhataPage() {
  const { t } = useTranslation();
  const { openDialog } = useDialogManager();
  const isSuperAdmin = useIsSuperAdmin();
  const { data: khatas = [], isLoading } = useKhatas();
  const setStatus = useSetKhataStatus();

  return (
    <div>
      <PageHeader
        title={t("khata.title")}
        actions={
          isSuperAdmin ? (
            <Button onClick={() => openDialog(DialogKey.KhataForm, null)}>
              <Plus className="me-1 h-4 w-4" />
              {t("khata.newEntry")}
            </Button>
          ) : null
        }
      />
      <KhataTable
        rows={khatas}
        loading={isLoading}
        onMarkFulfilled={(id) => setStatus.mutate({ id, status: KhataStatus.Fulfilled })}
      />
    </div>
  );
}
