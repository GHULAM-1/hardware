"use client";

import { Check, Loader2, Receipt } from "lucide-react";
import { useTranslation } from "react-i18next";

import { KhataStatus } from "@/lib/enums";
import { khataMeta } from "@/lib/status-meta";
import { displayName } from "@/lib/display";
import { formatDate, formatDateTime, todayISO } from "@/lib/format";
import { useLanguage } from "@/providers/i18n-provider";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { DataTable, type Column } from "@/components/common/data-table";
import { Money } from "@/components/common/money";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import type { KhataListView } from "@/types/models";

export function KhataTable({
  rows,
  loading,
  onMarkFulfilled,
  markingId,
  onViewReceipt,
  onRowClick,
  emptyText,
}: {
  rows: KhataListView[];
  loading?: boolean;
  onMarkFulfilled: (id: string) => void;
  /** Id of the khata currently being marked fulfilled (shows a spinner on its button). */
  markingId?: string;
  /** Open the linked order's receipt — shown only for khatas created from a sale. */
  onViewReceipt?: (orderId: string) => void;
  onRowClick?: (khata: KhataListView) => void;
  emptyText?: string;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isSuperAdmin = useIsSuperAdmin();
  const today = todayISO();

  const columns: Column<KhataListView>[] = [
    {
      key: "row_no",
      header: "#",
      headerClassName: "w-12",
      cell: (_k, i) => <span className="text-sm text-muted-foreground">{i + 1}</span>,
    },
    {
      key: "customer",
      header: t("fields.customer"),
      cell: (k) => (k.customer ? <span className="font-medium">{displayName(k.customer, language)}</span> : "—"),
    },
    { key: "desc", header: t("fields.note"), cell: (k) => k.description ?? "—" },
    { key: "due", header: t("fields.dueDate"), cell: (k) => formatDate(k.due_date) },
    {
      key: "status",
      header: t("fields.status"),
      cell: (k) => {
        const m = khataMeta(k.status as KhataStatus, k.due_date, today);
        return <StatusBadge tone={m.tone} label={t(m.labelKey)} />;
      },
    },
    {
      key: "amount",
      header: t("fields.amount"),
      cell: (k) => <Money value={k.amount} />,
      className: "text-end",
      headerClassName: "text-end",
    },
    {
      key: "added",
      header: t("fields.addedOn"),
      cell: (k) => <span className="whitespace-nowrap text-sm text-muted-foreground">{formatDateTime(k.created_at)}</span>,
      className: "hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
    },
    // Two fixed action columns so the buttons line up vertically across rows:
    // "Mark fulfilled" always in its own column, "View receipt" in the next.
    // Each stops propagation so the quick action doesn't also open the detail.
    {
      key: "fulfill",
      header: t("khata.settle"),
      headerClassName: "w-40 text-center",
      cell: (k) =>
        isSuperAdmin && k.status === KhataStatus.Pending ? (
          <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              disabled={Boolean(markingId)}
              onClick={() => onMarkFulfilled(k.id)}
            >
              {markingId === k.id ? (
                <Loader2 className="me-1 h-4 w-4 animate-spin" />
              ) : (
                <Check className="me-1 h-4 w-4" />
              )}
              {t("khata.markFulfilled")}
            </Button>
          </div>
        ) : null,
    },
    {
      key: "receipt",
      header: t("khata.receipt"),
      headerClassName: "w-40 text-center",
      cell: (k) =>
        k.order_id && onViewReceipt ? (
          <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" onClick={() => onViewReceipt(k.order_id as string)}>
              <Receipt className="me-1 h-4 w-4" />
              {t("khata.viewReceipt")}
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowId={(k) => k.id}
      loading={loading}
      emptyText={emptyText}
      onRowClick={onRowClick}
    />
  );
}
