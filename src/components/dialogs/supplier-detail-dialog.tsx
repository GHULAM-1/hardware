"use client";

import { useTranslation } from "react-i18next";
import { Pencil } from "lucide-react";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { DialogKey } from "@/lib/dialog-keys";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Supplier } from "@/types/models";

export type SupplierDetailPayload = { supplier: Supplier };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-end text-sm font-medium">{children}</span>
    </div>
  );
}

export function SupplierDetailDialog({ payload, onClose }: DialogComponentProps<SupplierDetailPayload>) {
  const { t } = useTranslation();
  const isSuperAdmin = useIsSuperAdmin();
  const { openDialog } = useDialogManager();
  const { supplier } = payload;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto overflow-x-hidden sm:max-w-md">
        <DialogHeader className="min-w-0">
          <DialogTitle className="break-words pe-6">{supplier.name}</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-card px-4 py-1">
          <Field label={t("suppliers.supplierName")}>{supplier.name}</Field>
          <Field label={t("fields.shopName")}>{supplier.shop_name ?? "—"}</Field>
          <Field label={t("fields.phone")}>
            {supplier.phone ? <span dir="ltr">{supplier.phone}</span> : "—"}
          </Field>
          <Field label={t("fields.address")}>{supplier.address ?? "—"}</Field>
        </div>

        {isSuperAdmin && (
          <DialogFooter>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => openDialog(DialogKey.SupplierForm, { supplier })}
            >
              <Pencil className="me-1 h-4 w-4" />
              {t("suppliers.editSupplier")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
