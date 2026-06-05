"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Receipt } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { PaymentType } from "@/lib/enums";
import { useOrders } from "@/hooks/use-orders";
import { useDebounce } from "@/hooks/use-debounce";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { useLanguage } from "@/providers/i18n-provider";
import { DialogKey } from "@/lib/dialog-keys";
import { displayName } from "@/lib/display";
import { formatDate } from "@/lib/format";
import { paymentMeta } from "@/lib/status-meta";
import { PageHeader } from "@/components/layout/page-header";
import { ListToolbar } from "@/components/common/list-toolbar";
import { DataTable, type Column } from "@/components/common/data-table";
import { Money } from "@/components/common/money";
import { StatusBadge } from "@/components/common/status-badge";
import type { OrderListView } from "@/types/models";

export default function OrdersPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { openDialog } = useDialogManager();
  const isSuperAdmin = useIsSuperAdmin();

  const [search, setSearch] = React.useState("");
  const debounced = useDebounce(search);
  const { data: orders = [], isLoading } = useOrders(debounced);

  const columns: Column<OrderListView>[] = [
    {
      key: "row_no",
      header: "#",
      headerClassName: "w-12",
      cell: (_o, i) => <span className="text-sm text-muted-foreground">{i + 1}</span>,
    },
    {
      key: "customer",
      header: t("fields.customer"),
      cell: (o) => (o.customer ? <span className="font-medium">{displayName(o.customer, language)}</span> : "—"),
    },
    { key: "date", header: t("fields.date"), cell: (o) => formatDate(o.created_at) },
    {
      key: "payment",
      header: t("fields.paymentType"),
      cell: (o) => {
        const m = paymentMeta(o.payment_type);
        return <StatusBadge tone={m.tone} label={t(m.labelKey)} />;
      },
    },
    {
      key: "balance",
      header: t("fields.balanceDue"),
      cell: (o) => (Number(o.balance_due) > 0 ? <Money value={o.balance_due} className="text-destructive" /> : "—"),
      className: "text-end",
      headerClassName: "text-end",
    },
    {
      key: "total",
      header: t("orders.total"),
      cell: (o) => <Money value={o.total} />,
      className: "text-end",
      headerClassName: "text-end",
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-px",
      cell: (o) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {isSuperAdmin && o.payment_type !== PaymentType.Cash && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title={t("orders.editPayment")}
              onClick={() => openDialog(DialogKey.OrderEdit, { order: o })}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => openDialog(DialogKey.Receipt, { orderId: o.id })}
          >
            <Receipt className="me-1 h-4 w-4" />
            {t("orders.print")}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title={t("orders.title")} />
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        onNew={() => openDialog(DialogKey.OrderForm, null)}
        newLabel={t("orders.newOrder")}
      />
      <DataTable
        columns={columns}
        rows={orders}
        getRowId={(r) => r.id}
        loading={isLoading}
        onRowClick={(row) => openDialog(DialogKey.Receipt, { orderId: row.id })}
      />
    </div>
  );
}
