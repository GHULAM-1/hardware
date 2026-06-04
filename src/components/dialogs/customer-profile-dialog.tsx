"use client";

import { useTranslation } from "react-i18next";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { useCustomerOrders, useLastPurchase } from "@/hooks/use-customers";
import { useLanguage } from "@/providers/i18n-provider";
import { displayName } from "@/lib/display";
import { formatDate, formatPKR } from "@/lib/format";
import { paymentMeta } from "@/lib/status-meta";
import { DataTable, type Column } from "@/components/common/data-table";
import { Money } from "@/components/common/money";
import { StatusBadge } from "@/components/common/status-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Customer, CustomerOrderView } from "@/types/models";

export type CustomerProfilePayload = { customer: Customer };

export function CustomerProfileDialog({ payload, onClose }: DialogComponentProps<CustomerProfilePayload>) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { customer } = payload;

  const { data: orders = [], isLoading } = useCustomerOrders(customer.id);
  const { data: last } = useLastPurchase(customer.id);

  const columns: Column<CustomerOrderView>[] = [
    { key: "order_no", header: "#", cell: (o) => <span className="font-mono text-sm">{o.order_no}</span> },
    { key: "date", header: t("fields.date"), cell: (o) => formatDate(o.created_at) },
    {
      key: "items",
      header: t("orders.lineItems"),
      cell: (o) =>
        o.lines
          .map((l) => `${l.item ? displayName(l.item, language) : "—"} ×${l.quantity}`)
          .join(", ") || "—",
    },
    {
      key: "payment",
      header: t("fields.paymentType"),
      cell: (o) => {
        const m = paymentMeta(o.payment_type);
        return <StatusBadge tone={m.tone} label={t(m.labelKey)} />;
      },
    },
    {
      key: "total",
      header: t("orders.total"),
      cell: (o) => <Money value={o.total} />,
      className: "text-end",
      headerClassName: "text-end",
    },
  ];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto overflow-x-hidden sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{displayName(customer, language)}</DialogTitle>
          <DialogDescription>
            {customer.phone ? <span dir="ltr">{customer.phone}</span> : null}
          </DialogDescription>
        </DialogHeader>

        {last ? (
          <p className="rounded-md bg-secondary px-3 py-2 text-sm">
            {t("customers.lastPurchase", {
              item: displayName(last.item, language),
              price: formatPKR(last.price),
            })}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{t("customers.noPurchases")}</p>
        )}

        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
            {t("customers.orderHistory")}
          </h3>
          <DataTable columns={columns} rows={orders} getRowId={(o) => o.id} loading={isLoading} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
