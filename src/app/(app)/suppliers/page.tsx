"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";

import { useSuppliers, useDeleteSupplier } from "@/hooks/use-suppliers";
import { useDebounce } from "@/hooks/use-debounce";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { useConfirmDelete } from "@/hooks/use-confirm-delete";
import { DialogKey } from "@/lib/dialog-keys";
import { PageHeader } from "@/components/layout/page-header";
import { ListToolbar } from "@/components/common/list-toolbar";
import { DataTable, type Column } from "@/components/common/data-table";
import { RowActions } from "@/components/common/row-actions";
import type { Supplier } from "@/types/models";

export default function SuppliersPage() {
  const { t } = useTranslation();
  const { openDialog } = useDialogManager();
  const confirmDelete = useConfirmDelete();
  const deleteSupplier = useDeleteSupplier();

  const [search, setSearch] = React.useState("");
  const debounced = useDebounce(search);
  const { data: suppliers = [], isLoading } = useSuppliers(debounced);

  const columns: Column<Supplier>[] = [
    {
      key: "row_no",
      header: "#",
      headerClassName: "w-12",
      cell: (_row, i) => <span className="text-sm text-muted-foreground">{i + 1}</span>,
    },
    {
      key: "name",
      header: t("suppliers.supplierName"),
      cell: (row) => (
        <span className="font-medium text-primary underline-offset-2 hover:underline">
          {row.name}
        </span>
      ),
    },
    {
      key: "shop_name",
      header: t("fields.shopName"),
      cell: (row) => row.shop_name ?? "—",
    },
    {
      key: "phone",
      header: t("fields.phone"),
      cell: (row) => (row.phone ? <span dir="ltr">{row.phone}</span> : "—"),
    },
    {
      key: "address",
      header: t("suppliers.location"),
      cell: (row) => row.address ?? "—",
      className: "hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-24",
      cell: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActions
            onEdit={() => openDialog(DialogKey.SupplierForm, { supplier: row })}
            onDelete={() =>
              confirmDelete({
                title: t("common.delete"),
                description: row.name,
                onConfirm: () => deleteSupplier.mutateAsync(row.id),
              })
            }
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title={t("suppliers.title")} />
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        onNew={() => openDialog(DialogKey.SupplierForm, null)}
        newLabel={t("suppliers.newSupplier")}
      />
      <DataTable
        columns={columns}
        rows={suppliers}
        getRowId={(r) => r.id}
        loading={isLoading}
        onRowClick={(row) => openDialog(DialogKey.SupplierDetail, { supplier: row })}
      />
    </div>
  );
}
