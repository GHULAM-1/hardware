"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Wallet } from "lucide-react";

import { Icon3D } from "@/components/ui/icon-3d";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { DialogKey } from "@/lib/dialog-keys";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageThumb } from "@/components/common/image-thumb";
import { StatusBadge } from "@/components/common/status-badge";
import { Money } from "@/components/common/money";
import { formatCnic } from "@/lib/format";
import type { Staff } from "@/types/models";

export type StaffDetailPayload = { staff: Staff };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-end text-sm font-medium">{children}</span>
    </div>
  );
}

export function StaffDetailDialog({ payload, onClose }: DialogComponentProps<StaffDetailPayload>) {
  const { t } = useTranslation();
  const { openDialog } = useDialogManager();
  const { staff } = payload;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto overflow-x-hidden sm:max-w-md">
        <DialogHeader className="min-w-0">
          <DialogTitle className="flex items-center gap-3 break-words pe-6">
            <ImageThumb src={staff.image_url} alt={staff.name} className="h-11 w-11" />
            <span>{staff.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-card px-4 py-1">
          <Field label={t("fields.phone")}>
            <span dir="ltr">{staff.phone}</span>
          </Field>
          <Field label={t("staff.cnic")}>
            {staff.cnic ? <span dir="ltr">{formatCnic(staff.cnic)}</span> : "—"}
          </Field>
          <Field label={t("staff.monthlySalary")}>
            <Money value={staff.monthly_salary} />
          </Field>
          <Field label={t("fields.address")}>{staff.address ?? "—"}</Field>
          <Field label={t("fields.status")}>
            <StatusBadge
              tone={staff.is_active ? "success" : "muted"}
              label={staff.is_active ? t("staff.active") : t("staff.inactive")}
            />
          </Field>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/staff/salary" onClick={onClose}>
              <Wallet className="me-1 h-4 w-4" />
              {t("staff.viewSalary")}
            </Link>
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => openDialog(DialogKey.StaffForm, { staff })}
          >
            <Icon3D name="pencil" size={24} className="-ms-1 me-1" alt="" />
            {t("staff.editStaff")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
