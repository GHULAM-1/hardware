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
    { key: "name", header: t("fields.name"), cell: (row) => <span className="font-medium">{row.name}</span> },
    { key: "phone", header: t("fields.phone"), cell: (row) => row.phone ?? "—" },
    { key: "note", header: t("fields.note"), cell: (row) => row.note ?? "—" },
    {
      key: "actions",
      header: "",
      headerClassName: "w-24",
      cell: (row) => (
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
      <DataTable columns={columns} rows={suppliers} getRowId={(r) => r.id} loading={isLoading} />
    </div>
  );
}
