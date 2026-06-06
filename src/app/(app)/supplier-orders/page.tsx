"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";

import { useSupplierOrders, useDeleteSupplierOrder } from "@/hooks/use-supplier-orders";
import { useDebounce } from "@/hooks/use-debounce";
import { useConfirmDelete } from "@/hooks/use-confirm-delete";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { useLanguage } from "@/providers/i18n-provider";
import { DialogKey } from "@/lib/dialog-keys";
import { SupplierOrderStatus } from "@/lib/enums";
import { displayName } from "@/lib/display";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { ListToolbar } from "@/components/common/list-toolbar";
import { DataTable, type Column } from "@/components/common/data-table";
import { RowActions } from "@/components/common/row-actions";
import { StatusBadge } from "@/components/common/status-badge";
import type { SupplierOrderListView } from "@/types/models";

export default function SupplierOrdersPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { openDialog } = useDialogManager();
  const confirmDelete = useConfirmDelete();
  const deleteOrder = useDeleteSupplierOrder();

  const [search, setSearch] = React.useState("");
  const debounced = useDebounce(search);
  const { data: orders = [], isLoading } = useSupplierOrders(debounced);

  const columns: Column<SupplierOrderListView>[] = [
    {
      key: "row_no",
      header: "#",
      headerClassName: "w-12",
      cell: (_o, i) => <span className="text-sm text-muted-foreground">{i + 1}</span>,
    },
    {
      key: "date",
      header: t("fields.date"),
      cell: (o) => formatDate(o.created_at),
      className: "hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
    },
    {
      key: "supplier",
      header: t("fields.supplier"),
      cell: (o) => o.supplier?.name ?? "—",
    },
    {
      key: "items",
      header: t("supplierOrders.items"),
      cell: (o) => {
        if (!o.items.length) return <span className="text-muted-foreground">—</span>;
        const names = o.items.map((it) => displayName(it, language));
        const shown = names.slice(0, 2).join(", ");
        const extra = names.length - 2;
        return (
          <span className="text-sm">
            {shown}
            {extra > 0 && <span className="text-muted-foreground"> +{extra}</span>}
          </span>
        );
      },
    },
    {
      key: "status",
      header: t("fields.status"),
      cell: (o) => (
        <StatusBadge
          tone={o.status === SupplierOrderStatus.Received ? "success" : "warning"}
          label={t(o.status === SupplierOrderStatus.Received ? "supplierOrders.received" : "supplierOrders.pending")}
        />
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-px",
      cell: (o) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <RowActions
            onDelete={() =>
              confirmDelete({
                title: t("common.delete"),
                description: o.supplier?.name ?? o.order_no,
                onConfirm: () => deleteOrder.mutateAsync(o.id),
              })
            }
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title={t("supplierOrders.title")} />
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("supplierOrders.searchOrders")}
        onNew={() => openDialog(DialogKey.SupplierOrderForm, null)}
        newLabel={t("supplierOrders.newOrder")}
      />
      <DataTable
        columns={columns}
        rows={orders}
        getRowId={(r) => r.id}
        loading={isLoading}
        emptyText={t("supplierOrders.empty")}
        onRowClick={(row) => openDialog(DialogKey.SupplierOrderDetail, { id: row.id })}
      />
    </div>
  );
}
