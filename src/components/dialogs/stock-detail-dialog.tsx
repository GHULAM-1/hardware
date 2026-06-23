"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { StockEntryType } from "@/lib/enums";
import { useStockEntries, useDeleteStockEntry } from "@/hooks/use-warehouse";
import { useConfirmDelete } from "@/hooks/use-confirm-delete";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/i18n-provider";
import { displayName } from "@/lib/display";
import { formatQuantity } from "@/lib/units";
import { StockEntryForm } from "@/components/warehouse/stock-entry-form";
import { StockHistoryTable } from "@/components/warehouse/stock-history-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ItemWithStock, StockEntryWithSupplier } from "@/types/models";

export type StockDetailPayload = { item: ItemWithStock };

export function StockDetailDialog({ payload, onClose }: DialogComponentProps<StockDetailPayload>) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isSuperAdmin = useIsSuperAdmin();
  const confirmDelete = useConfirmDelete();
  const deleteEntry = useDeleteStockEntry();

  const { item } = payload;
  const { data: entries = [], isLoading } = useStockEntries(item.id);
  const [editing, setEditing] = React.useState<StockEntryWithSupplier | null>(null);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto overflow-x-hidden sm:max-w-3xl">
        <DialogHeader className="min-w-0">
          <DialogTitle className="truncate pe-6">{displayName(item, language)}</DialogTitle>
          <DialogDescription dir="ltr">
            {t("warehouse.currentStock")}:{" "}
            <span className="font-semibold tabular-nums">
              {formatQuantity(item, item.quantity, (k) => t(`units.${k}`))}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          {isSuperAdmin && (
            <StockEntryForm
              key={editing?.id ?? "new"}
              item={item}
              editing={editing}
              onDone={() => setEditing(null)}
            />
          )}

          <div>
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
              {t("warehouse.history")}
            </h3>
            <StockHistoryTable
              item={item}
              entries={entries}
              loading={isLoading}
              onEdit={(entry) => setEditing(entry)}
              onDelete={(entry) =>
                confirmDelete({
                  title: t("common.delete"),
                  description: `${t(entry.type === StockEntryType.In ? "warehouse.stockIn" : "warehouse.stockOut")} · ${entry.quantity}`,
                  onConfirm: () => deleteEntry.mutateAsync(entry.id),
                })
              }
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
