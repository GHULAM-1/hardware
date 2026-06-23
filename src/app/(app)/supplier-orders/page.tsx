"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { ClipboardCheck, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSupplierOrders, useDeleteSupplierOrder } from "@/hooks/use-supplier-orders";
import { useDebounce } from "@/hooks/use-debounce";
import { useConfirmDelete } from "@/hooks/use-confirm-delete";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { useLanguage } from "@/providers/i18n-provider";
import { DialogKey } from "@/lib/dialog-keys";
import { SupplierOrderStatus } from "@/lib/enums";
import { displayName } from "@/lib/display";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { ListToolbar } from "@/components/common/list-toolbar";
import { DataTable, type Column } from "@/components/common/data-table";
import { RowActions } from "@/components/common/row-actions";
import { StatusBadge, type StatusTone } from "@/components/common/status-badge";
import { SupplierOrderSharePdf } from "@/components/supplier-orders/supplier-order-share-pdf";
import type { SupplierOrderListView } from "@/types/models";

const STATUS_TONE: Record<string, StatusTone> = {
  [SupplierOrderStatus.Pending]: "warning",
  [SupplierOrderStatus.Partial]: "info",
  [SupplierOrderStatus.Received]: "success",
};
const STATUS_LABEL: Record<string, string> = {
  [SupplierOrderStatus.Pending]: "supplierOrders.pending",
  [SupplierOrderStatus.Partial]: "supplierOrders.partial",
  [SupplierOrderStatus.Received]: "supplierOrders.received",
};

export default function SupplierOrdersPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { openDialog } = useDialogManager();
  const confirmDelete = useConfirmDelete();
  const deleteOrder = useDeleteSupplierOrder();

  const [search, setSearch] = React.useState("");
  const debounced = useDebounce(search);
  const { data: orders = [], isLoading } = useSupplierOrders(debounced);
  const [shareId, setShareId] = React.useState<string | null>(null);

  const columns: Column<SupplierOrderListView>[] = [
    {
      key: "row_no",
      header: "#",
      headerClassName: "w-12",
      cell: (_o, i) => <span className="text-sm text-muted-foreground">{i + 1}</span>,
    },
    {
      key: "supplier",
      header: t("fields.supplier"),
      cell: (o) => {
        if (!o.suppliers.length) return <span className="text-muted-foreground">—</span>;
        const shown = o.suppliers.slice(0, 2).join(", ");
        const extra = o.suppliers.length - 2;
        return (
          <span className="text-sm">
            {shown}
            {extra > 0 && <span className="text-muted-foreground"> +{extra}</span>}
          </span>
        );
      },
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
      cell: (o) => <StatusBadge tone={STATUS_TONE[o.status]} label={t(STATUS_LABEL[o.status])} />,
    },
    {
      key: "date",
      header: t("fields.addedOn"),
      cell: (o) => <span className="whitespace-nowrap text-sm text-muted-foreground">{formatDateTime(o.created_at)}</span>,
      className: "hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-px",
      cell: (o) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            title={t("supplierOrders.tally")}
            aria-label={t("supplierOrders.tally")}
            onClick={() => openDialog(DialogKey.SupplierOrderTally, { id: o.id })}
          >
            <ClipboardCheck className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            title={t("common.share")}
            aria-label={t("common.share")}
            onClick={() => setShareId(o.id)}
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <RowActions
            onEdit={() => openDialog(DialogKey.SupplierOrderForm, { id: o.id })}
            onDelete={() =>
              confirmDelete({
                title: t("common.delete"),
                description: o.order_no,
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
      {shareId && <SupplierOrderSharePdf orderId={shareId} onDone={() => setShareId(null)} />}
    </div>
  );
}
