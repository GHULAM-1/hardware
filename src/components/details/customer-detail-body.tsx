"use client";

import { useTranslation } from "react-i18next";

import { useCustomerOrders, useLastPurchase } from "@/hooks/use-customers";
import { useLanguage } from "@/providers/i18n-provider";
import { displayName } from "@/lib/display";
import { formatDate, formatPKR } from "@/lib/format";
import { paymentMeta } from "@/lib/status-meta";
import { DataTable, type Column } from "@/components/common/data-table";
import { Money } from "@/components/common/money";
import { StatusBadge } from "@/components/common/status-badge";
import type { Customer, CustomerOrderView } from "@/types/models";

/**
 * Customer detail content (blacklist flag, internal note, last purchase, order
 * history) — shared by the customer profile dialog and the quick-search preview
 * pane so both stay identical. The heading/title is provided by the caller.
 */
export function CustomerDetailBody({ customer }: { customer: Customer }) {
  const { t } = useTranslation();
  const { language } = useLanguage();

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
    <div className="space-y-4">
      {customer.is_blacklisted && (
        <StatusBadge tone="danger" label={t("customers.blacklisted")} className="self-start" />
      )}

      {customer.notes && (
        <div className="min-w-0 space-y-1 rounded-lg border border-border bg-secondary/40 p-3">
          <p className="text-xs font-semibold text-muted-foreground">{t("customers.internalNote")}</p>
          <p className="whitespace-pre-wrap break-words text-sm">{customer.notes}</p>
        </div>
      )}

      {last ? (
        <p className="min-w-0 break-words rounded-md bg-secondary px-3 py-2 text-sm">
          {t("customers.lastPurchase", {
            item: displayName(last.item, language),
            price: formatPKR(last.price),
          })}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">{t("customers.noPurchases")}</p>
      )}

      <div className="min-w-0">
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
          {t("customers.orderHistory")}
        </h3>
        <DataTable columns={columns} rows={orders} getRowId={(o) => o.id} loading={isLoading} />
      </div>
    </div>
  );
}
