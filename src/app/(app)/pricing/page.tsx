"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";

import { useItems, useDeleteItem } from "@/hooks/use-items";
import { useDebounce } from "@/hooks/use-debounce";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { useConfirmDelete } from "@/hooks/use-confirm-delete";
import { useLanguage } from "@/providers/i18n-provider";
import { DialogKey } from "@/lib/dialog-keys";
import { displayName } from "@/lib/display";
import { PageHeader } from "@/components/layout/page-header";
import { ListToolbar } from "@/components/common/list-toolbar";
import { DataTable, type Column } from "@/components/common/data-table";
import { Money } from "@/components/common/money";
import { RowActions } from "@/components/common/row-actions";
import type { Item } from "@/types/models";

export default function PricingPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { openDialog } = useDialogManager();
  const confirmDelete = useConfirmDelete();
  const deleteItem = useDeleteItem();

  const [search, setSearch] = React.useState("");
  const debounced = useDebounce(search);
  const { data: items = [], isLoading } = useItems(debounced);

  const columns: Column<Item>[] = [
    {
      key: "name",
      header: t("fields.name"),
      cell: (row) => <span className="font-medium">{displayName(row, language)}</span>,
    },
    { key: "sku", header: t("fields.sku"), cell: (row) => <span className="font-mono text-sm">{row.sku}</span> },
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
        <RowActions
          onEdit={() => openDialog(DialogKey.ItemForm, { item: row })}
          onDelete={() =>
            confirmDelete({
              title: t("common.delete"),
              description: displayName(row, language),
              onConfirm: () => deleteItem.mutateAsync(row.id),
            })
          }
        />
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
      <DataTable columns={columns} rows={items} getRowId={(r) => r.id} loading={isLoading} />
    </div>
  );
}
