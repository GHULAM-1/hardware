"use client";

import { useTranslation } from "react-i18next";

import { KhataStatus } from "@/lib/enums";
import { khataMeta } from "@/lib/status-meta";
import { displayName } from "@/lib/display";
import { formatDate, todayISO } from "@/lib/format";
import { useLanguage } from "@/providers/i18n-provider";
import { DataTable, type Column } from "@/components/common/data-table";
import { Money } from "@/components/common/money";
import { StatusBadge } from "@/components/common/status-badge";
import type { CustomerKhataGroup } from "@/lib/khata-groups";

/**
 * The cumulative khata list — one row per customer who currently owes, showing
 * how many unsettled entries they have, the soonest due date (with an overdue /
 * due-soon badge) and the total outstanding. Clicking a row opens that customer's
 * full udhaar record.
 */
export function CustomerKhataTable({
  groups,
  loading,
  onRowClick,
  emptyText,
}: {
  groups: CustomerKhataGroup[];
  loading?: boolean;
  onRowClick?: (group: CustomerKhataGroup) => void;
  emptyText?: string;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const today = todayISO();

  const columns: Column<CustomerKhataGroup>[] = [
    {
      key: "customer",
      header: t("fields.customer"),
      cell: (g) => (
        <div className="flex flex-col">
          <span className="font-medium">{displayName(g.customer, language)}</span>
          {g.customer.phone ? (
            <span dir="ltr" className="text-xs text-muted-foreground">
              {g.customer.phone}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "count",
      header: t("khata.entries"),
      cell: (g) => t("khata.entriesCount", { count: g.pendingCount }),
    },
    {
      key: "due",
      header: t("khata.soonestDue"),
      cell: (g) => {
        if (!g.soonestDueDate) return "—";
        const m = khataMeta(KhataStatus.Pending, g.soonestDueDate, today);
        return (
          <div className="flex flex-wrap items-center gap-2">
            <span>{formatDate(g.soonestDueDate)}</span>
            <StatusBadge tone={m.tone} label={t(m.labelKey)} />
          </div>
        );
      },
    },
    {
      key: "total",
      header: t("khata.totalOutstanding"),
      cell: (g) => <Money value={g.totalOutstanding} className="font-bold" />,
      className: "text-end",
      headerClassName: "text-end",
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={groups}
      getRowId={(g) => g.customer.id}
      loading={loading}
      emptyText={emptyText}
      onRowClick={onRowClick}
    />
  );
}
