"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useCustomerOrders, useLastPurchase } from "@/hooks/use-customers";
import { useLanguage } from "@/providers/i18n-provider";
import { displayName } from "@/lib/display";
import { formatDate, formatPKR } from "@/lib/format";
import { paymentMeta } from "@/lib/status-meta";
import { DataTable, type Column } from "@/components/common/data-table";
import { Money } from "@/components/common/money";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/common/status-badge";
import type { Customer, CustomerOrderView } from "@/types/models";

/** One item-line from the customer's history, flattened for the item lookup. */
type PurchaseLine = {
  id: string;
  order_no: string;
  created_at: string;
  payment_type: CustomerOrderView["payment_type"];
  name_en: string;
  name_ur: string | null;
  quantity: number;
  selling_price: number;
  cost_at_sale: number | null;
};

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

  const [itemQuery, setItemQuery] = React.useState("");

  // Flatten every purchased item-line across all this customer's orders, so we
  // can search for one item and list each time it was sold.
  const purchaseLines = React.useMemo<PurchaseLine[]>(
    () =>
      orders.flatMap((o) =>
        o.lines.map((l, i) => ({
          id: `${o.id}-${i}`,
          order_no: o.order_no,
          created_at: o.created_at,
          payment_type: o.payment_type,
          name_en: l.item?.name_en ?? "",
          name_ur: l.item?.name_ur ?? null,
          quantity: l.quantity,
          selling_price: l.selling_price,
          cost_at_sale: l.cost_at_sale,
        })),
      ),
    [orders],
  );

  const q = itemQuery.trim().toLowerCase();
  // One row per purchased item-line, filtered by the item search when active.
  const rows = React.useMemo(
    () =>
      q
        ? purchaseLines.filter(
            (r) =>
              r.name_en.toLowerCase().includes(q) ||
              (r.name_ur ?? "").toLowerCase().includes(q),
          )
        : purchaseLines,
    [purchaseLines, q],
  );

  // Totals across the currently-shown lines (used for the filter summary).
  const totalQty = rows.reduce((s, r) => s + r.quantity, 0);
  const totalSpent = rows.reduce((s, r) => s + r.selling_price * r.quantity, 0);

  const columns: Column<PurchaseLine>[] = [
    { key: "order_no", header: t("customers.bill"), cell: (r) => <span className="font-mono text-sm">{r.order_no}</span> },
    { key: "date", header: t("fields.date"), cell: (r) => <span className="whitespace-nowrap">{formatDate(r.created_at)}</span> },
    {
      key: "item",
      header: t("fields.item"),
      cell: (r) => displayName({ name_en: r.name_en, name_ur: r.name_ur }, language),
    },
    { key: "qty", header: t("fields.quantity"), cell: (r) => <span className="tabular-nums">{r.quantity}</span>, className: "text-end", headerClassName: "text-end" },
    {
      key: "buying",
      header: t("customers.buyingPriceThen"),
      cell: (r) => (r.cost_at_sale != null ? <Money value={r.cost_at_sale} /> : "—"),
      className: "text-end",
      headerClassName: "text-end",
    },
    {
      key: "selling",
      header: t("customers.sellingPriceThen"),
      cell: (r) => <Money value={r.selling_price} />,
      className: "text-end",
      headerClassName: "text-end",
    },
    {
      key: "line_total",
      header: t("orders.total"),
      cell: (r) => <Money value={r.selling_price * r.quantity} />,
      className: "text-end",
      headerClassName: "text-end",
    },
    {
      key: "profit",
      header: t("customers.profit"),
      cell: (r) =>
        r.cost_at_sale != null ? (
          <Money value={(r.selling_price - r.cost_at_sale) * r.quantity} />
        ) : (
          "—"
        ),
      className: "text-end",
      headerClassName: "text-end",
    },
    {
      key: "payment",
      header: t("fields.paymentType"),
      cell: (r) => {
        const m = paymentMeta(r.payment_type);
        return <StatusBadge tone={m.tone} label={t(m.labelKey)} />;
      },
    },
  ];

  return (
    <div className="min-w-0 space-y-4">
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

      {/* Order history — one row per purchased item, searchable by item name.
          Each line carries the buying/selling price snapshotted at that sale. */}
      <div className="min-w-0 space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {t("customers.orderHistory")}
        </h3>
        <div className="relative w-full">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={itemQuery}
            onChange={(e) => setItemQuery(e.target.value)}
            placeholder={t("customers.itemLookupPlaceholder")}
            className="ps-9"
          />
        </div>

        {q ? (
          <p className="text-xs text-muted-foreground">
            {t("customers.itemLookupSummary", {
              count: rows.length,
              qty: totalQty,
              total: formatPKR(totalSpent),
            })}
          </p>
        ) : null}

        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(r) => r.id}
          loading={isLoading}
          emptyText={q ? t("customers.noItemMatches") : undefined}
        />
      </div>
    </div>
  );
}
