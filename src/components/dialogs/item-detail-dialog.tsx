"use client";

import { useTranslation } from "react-i18next";
import { Pencil } from "lucide-react";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { useItemStock } from "@/hooks/use-warehouse";
import { useLanguage } from "@/providers/i18n-provider";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { DialogKey } from "@/lib/dialog-keys";
import { displayName } from "@/lib/display";
import { formatNumber } from "@/lib/format";
import { Money } from "@/components/common/money";
import { ImageThumb } from "@/components/common/image-thumb";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Item } from "@/types/models";

export type ItemDetailPayload = { item: Item };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-end text-sm font-medium">{children}</span>
    </div>
  );
}

export function ItemDetailDialog({ payload, onClose }: DialogComponentProps<ItemDetailPayload>) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isSuperAdmin = useIsSuperAdmin();
  const { openDialog } = useDialogManager();

  const { item } = payload;
  const { data: stock, isLoading: stockLoading } = useItemStock(item.id);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto overflow-x-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <ImageThumb src={item.image_url} alt={item.name_en} />
            <span className="min-w-0 truncate">{displayName(item, language)}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-card px-4 py-1">
          <Field label={t("warehouse.currentStock")}>
            {stockLoading
              ? "…"
              : `${formatNumber(stock ?? 0)} ${t(`units.${item.unit}`)}`}
          </Field>
          <Field label={t("fields.unit")}>{t(`units.${item.unit}`)}</Field>
          <Field label={t("fields.sellingPrice")}>
            <Money value={item.selling_price} />
          </Field>
        </div>

        {isSuperAdmin && (
          <DialogFooter>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => openDialog(DialogKey.ItemForm, { item })}
            >
              <Pencil className="me-1 h-4 w-4" />
              {t("pricing.editItem")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
