"use client";

import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { KhataStatus } from "@/lib/enums";
import { khataMeta } from "@/lib/status-meta";
import { displayName } from "@/lib/display";
import { formatDate, todayISO } from "@/lib/format";
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
  emptyText,
}: {
  rows: KhataListView[];
  loading?: boolean;
  onMarkFulfilled: (id: string) => void;
  emptyText?: string;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isSuperAdmin = useIsSuperAdmin();
  const today = todayISO();

  const columns: Column<KhataListView>[] = [
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
      key: "actions",
      header: "",
      headerClassName: "w-32",
      cell: (k) =>
        isSuperAdmin && k.status === KhataStatus.Pending ? (
          <Button variant="outline" size="sm" onClick={() => onMarkFulfilled(k.id)}>
            <Check className="me-1 h-4 w-4" />
            {t("khata.markFulfilled")}
          </Button>
        ) : null,
    },
  ];

  return (
    <DataTable columns={columns} rows={rows} getRowId={(k) => k.id} loading={loading} emptyText={emptyText} />
  );
}
