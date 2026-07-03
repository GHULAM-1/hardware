"use client";

import { useTranslation } from "react-i18next";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { StaffDetailBody } from "@/components/details/staff-detail-body";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageThumb } from "@/components/common/image-thumb";
import { StatusBadge } from "@/components/common/status-badge";
import type { Staff } from "@/types/models";

export type StaffDetailPayload = { staff: Staff };

export function StaffDetailDialog({ payload, onClose }: DialogComponentProps<StaffDetailPayload>) {
  const { t } = useTranslation();
  const { staff } = payload;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto overflow-x-hidden sm:max-w-md">
        <DialogHeader className="min-w-0">
          <DialogTitle className="flex items-center gap-3 break-words pe-6">
            <ImageThumb src={staff.image_url} alt={staff.name} className="h-12 w-12" />
            <span className="min-w-0 flex-1">
              <span className="block break-words">{staff.name}</span>
              <StatusBadge
                tone={staff.is_active ? "success" : "muted"}
                label={staff.is_active ? t("staff.active") : t("staff.inactive")}
              />
            </span>
          </DialogTitle>
        </DialogHeader>

        <StaffDetailBody staff={staff} onNavigate={onClose} />
      </DialogContent>
    </Dialog>
  );
}
