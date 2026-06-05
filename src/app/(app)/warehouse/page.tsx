"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { Boxes } from "lucide-react";

import { useItemsWithStock } from "@/hooks/use-warehouse";
import { useDeleteItem, useUsedItemIds } from "@/hooks/use-items";
import { useDebounce } from "@/hooks/use-debounce";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { useConfirmDelete } from "@/hooks/use-confirm-delete";
import { useLanguage } from "@/providers/i18n-provider";
import { DialogKey } from "@/lib/dialog-keys";
import { displayName } from "@/lib/display";
import { stockMeta } from "@/lib/status-meta";
import { PageHeader } from "@/components/layout/page-header";
import { ListToolbar } from "@/components/common/list-toolbar";
import { DataTable, type Column } from "@/components/common/data-table";
import { RowActions } from "@/components/common/row-actions";
import { ImageThumb } from "@/components/common/image-thumb";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import type { ItemWithStock } from "@/types/models";

export default function WarehousePage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { openDialog } = useDialogManager();
  const confirmDelete = useConfirmDelete();
  const deleteItem = useDeleteItem();

  const [search, setSearch] = React.useState("");
  const debounced = useDebounce(search);
  const { data: items = [], isLoading } = useItemsWithStock(debounced);
  const { data: usedItemIds } = useUsedItemIds();

  const columns: Column<ItemWithStock>[] = [
    {
      key: "row_no",
      header: "#",
      headerClassName: "w-12",
      cell: (_row, i) => <span className="text-sm text-muted-foreground">{i + 1}</span>,
    },
    {
      key: "name",
      header: t("fields.name"),
      cell: (row) => (
        <div className="flex items-center gap-3">
          <ImageThumb src={row.image_url} alt={row.name_en} />
          <span className="font-medium">{displayName(row, language)}</span>
        </div>
      ),
    },
    {
      key: "unit",
      header: t("fields.unit"),
      cell: (row) => t(`units.${row.unit}`),
      className: "hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
    },
    {
      key: "qty",
      header: t("warehouse.currentStock"),
      cell: (row) => (
        <span dir="ltr" className="font-semibold tabular-nums">
          {row.quantity}
        </span>
      ),
    },
    {
      key: "status",
      header: t("fields.status"),
      cell: (row) => {
        const m = stockMeta(row.quantity);
        return <StatusBadge tone={m.tone} label={t(m.labelKey)} />;
      },
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-px",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openDialog(DialogKey.StockEntryForm, { item: row })}
          >
            <Boxes className="me-1 h-4 w-4" />
            {t("warehouse.manageStock")}
          </Button>
          <RowActions
            onEdit={() => openDialog(DialogKey.ItemForm, { item: row })}
            deleteDisabled={usedItemIds?.has(row.id)}
            deleteDisabledReason={t("pricing.itemInUse")}
            onDelete={() =>
              confirmDelete({
                title: t("common.delete"),
                description: displayName(row, language),
                onConfirm: () => deleteItem.mutateAsync(row.id),
              })
            }
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title={t("warehouse.title")} subtitle={t("warehouse.subtitle")} />
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        onNew={() => openDialog(DialogKey.ItemCreate, null)}
        newLabel={t("pricing.newItem")}
      />
      <DataTable
        columns={columns}
        rows={items}
        getRowId={(r) => r.id}
        loading={isLoading}
        onRowClick={(row) => openDialog(DialogKey.StockEntryForm, { item: row })}
      />
    </div>
  );
}
