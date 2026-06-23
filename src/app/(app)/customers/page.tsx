"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";

import { useCustomers, useDeleteCustomer, useUsedCustomerIds } from "@/hooks/use-customers";
import { useDebounce } from "@/hooks/use-debounce";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { useConfirmDelete } from "@/hooks/use-confirm-delete";
import { useLanguage } from "@/providers/i18n-provider";
import { DialogKey } from "@/lib/dialog-keys";
import { displayName } from "@/lib/display";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { ListToolbar } from "@/components/common/list-toolbar";
import { DataTable, type Column } from "@/components/common/data-table";
import { RowActions } from "@/components/common/row-actions";
import { StatusBadge } from "@/components/common/status-badge";
import type { Customer } from "@/types/models";

export default function CustomersPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { openDialog } = useDialogManager();
  const confirmDelete = useConfirmDelete();
  const deleteCustomer = useDeleteCustomer();

  const [search, setSearch] = React.useState("");
  const debounced = useDebounce(search);
  const { data: customers = [], isLoading } = useCustomers(debounced);
  const { data: usedCustomerIds } = useUsedCustomerIds();

  const columns: Column<Customer>[] = [
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
        <div className="flex items-center gap-2">
          <span className="font-medium text-primary underline-offset-2 hover:underline">
            {displayName(row, language)}
          </span>
          {row.is_blacklisted && <StatusBadge tone="danger" label={t("customers.blacklisted")} />}
        </div>
      ),
    },
    { key: "phone", header: t("fields.phone"), cell: (row) => (row.phone ? <span dir="ltr">{row.phone}</span> : "—") },
    { key: "address", header: t("fields.address"), cell: (row) => row.address ?? "—" },
    {
      key: "added",
      header: t("fields.addedOn"),
      cell: (row) => <span className="whitespace-nowrap text-sm text-muted-foreground">{formatDateTime(row.created_at)}</span>,
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
            onEdit={() => openDialog(DialogKey.CustomerForm, { customer: row })}
            deleteDisabled={usedCustomerIds?.has(row.id)}
            deleteDisabledReason={t("customers.customerInUse")}
            onDelete={() =>
              confirmDelete({
                title: t("common.delete"),
                description: displayName(row, language),
                onConfirm: () => deleteCustomer.mutateAsync(row.id),
              })
            }
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title={t("customers.title")} />
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        onNew={() => openDialog(DialogKey.CustomerForm, null)}
        newLabel={t("customers.newCustomer")}
      />
      <DataTable
        columns={columns}
        rows={customers}
        getRowId={(r) => r.id}
        loading={isLoading}
        onRowClick={(row) => openDialog(DialogKey.CustomerProfile, { customer: row })}
      />
    </div>
  );
}
