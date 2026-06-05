"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";

import { useDeleteItem, useUsedItemIds } from "@/hooks/use-items";
import { useItemsWithStock } from "@/hooks/use-warehouse";
import { useDebounce } from "@/hooks/use-debounce";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { useConfirmDelete } from "@/hooks/use-confirm-delete";
import { useLanguage } from "@/providers/i18n-provider";
import { DialogKey } from "@/lib/dialog-keys";
import { displayName } from "@/lib/display";
import { formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { ListToolbar } from "@/components/common/list-toolbar";
import { DataTable, type Column } from "@/components/common/data-table";
import { Money } from "@/components/common/money";
import { RowActions } from "@/components/common/row-actions";
import { ImageThumb } from "@/components/common/image-thumb";
import type { ItemWithStock } from "@/types/models";

export default function PricingPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { openDialog } = useDialogManager();
  const confirmDelete = useConfirmDelete();
  const deleteItem = useDeleteItem();

  const [search, setSearch] = React.useState("");
  const debounced = useDebounce(search);
  // Pricing shares the catalog with the warehouse; this variant carries each
  // item's live stock quantity so we can show it alongside the price.
  const { data: items = [], isLoading } = useItemsWithStock(debounced);
  const { data: usedItemIds } = useUsedItemIds();

  const columns: Column<ItemWithStock>[] = [
    {
      key: "name",
      header: t("fields.name"),
      cell: (row) => (
        <div className="flex items-center gap-3">
          <ImageThumb src={row.image_url} alt={row.name_en} />
          <span className="font-medium text-primary underline-offset-2 hover:underline">
            {displayName(row, language)}
          </span>
        </div>
      ),
    },
    {
      key: "stock",
      header: t("warehouse.currentStock"),
      cell: (row) => <span className="tabular-nums">{formatNumber(row.quantity)}</span>,
    },
    { key: "unit", header: t("fields.unit"), cell: (row) => t(`units.${row.unit}`) },
    {
      key: "price",
      header: t("fields.sellingPrice"),
      cell: (row) => <Money value={row.selling_price} />,
      className: "text-end",
      headerClassName: "text-end",
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-24",
      cell: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
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
      <PageHeader title={t("pricing.title")} subtitle={t("pricing.subtitle")} />
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("pricing.searchItems")}
        onNew={() => openDialog(DialogKey.ItemCreate, null)}
        newLabel={t("pricing.newItem")}
      />
      <DataTable
        columns={columns}
        rows={items}
        getRowId={(r) => r.id}
        loading={isLoading}
        onRowClick={(row) => openDialog(DialogKey.ItemDetail, { item: row })}
      />
    </div>
  );
}
