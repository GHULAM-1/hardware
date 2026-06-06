"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronRight as RowChevron } from "lucide-react";

import { useSalaryOverview } from "@/hooks/use-salary";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { DialogKey } from "@/lib/dialog-keys";
import { monthKeyLocal } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { Money } from "@/components/common/money";
import { Button } from "@/components/ui/button";
import type { StaffSalaryRow } from "@/types/models";

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    new Date(y, m - 1, 1),
  );
}

export default function SalaryPage() {
  const { t } = useTranslation();
  const { openDialog } = useDialogManager();
  const [month, setMonth] = React.useState(() => monthKeyLocal());
  const { data: rows = [], isLoading } = useSalaryOverview(month);

  const columns: Column<StaffSalaryRow>[] = [
    {
      key: "name",
      header: t("staff.staffName"),
      cell: (r) => <span className="font-medium">{r.staff.name}</span>,
    },
    {
      key: "absent",
      header: t("staff.absentDays"),
      cell: (r) => r.absentDays,
      className: "hidden sm:table-cell",
      headerClassName: "hidden sm:table-cell",
    },
    {
      key: "advances",
      header: t("staff.advancesTotal"),
      cell: (r) => <Money value={r.advancesTotal} />,
      className: "hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
    },
    {
      key: "net",
      header: t("staff.suggestedNet"),
      cell: (r) => <Money value={r.netPayable} className="font-semibold" />,
    },
    {
      key: "status",
      header: t("fields.status"),
      cell: (r) =>
        r.paid ? (
          <div className="flex flex-col items-start gap-0.5">
            <StatusBadge tone="success" label={t("staff.paid")} />
            <Money value={r.amountPaid} className="text-xs text-muted-foreground" />
          </div>
        ) : (
          <StatusBadge tone="warning" label={t("staff.unpaid")} />
        ),
    },
    {
      key: "chevron",
      header: "",
      headerClassName: "w-8",
      cell: () => <RowChevron className="ms-auto h-4 w-4 text-muted-foreground rtl:rotate-180" />,
    },
  ];

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="-ms-2 mb-2 text-muted-foreground">
        <Link href="/staff">
          <ArrowLeft className="me-1 h-4 w-4 rtl:rotate-180" />
          {t("staff.title")}
        </Link>
      </Button>
      <PageHeader title={t("staff.salaries")} />

      <div className="mb-4 flex items-center justify-center gap-3">
        <Button variant="outline" size="icon" onClick={() => setMonth((m) => shiftMonth(m, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-44 text-center font-medium">{monthLabel(month)}</span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
          disabled={month >= monthKeyLocal()}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.staff.id}
        loading={isLoading}
        emptyText={t("staff.empty")}
        onRowClick={(r) =>
          openDialog(DialogKey.SalarySlip, {
            staffId: r.staff.id,
            staffName: r.staff.name,
            month,
          })
        }
      />
    </div>
  );
}
