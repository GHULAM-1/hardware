"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { CalendarCheck, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useStaff, useDeleteStaff } from "@/hooks/use-staff";
import { useDebounce } from "@/hooks/use-debounce";
import { useConfirmDelete } from "@/hooks/use-confirm-delete";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { DialogKey } from "@/lib/dialog-keys";
import { PageHeader } from "@/components/layout/page-header";
import { ListToolbar } from "@/components/common/list-toolbar";
import { DataTable, type Column } from "@/components/common/data-table";
import { RowActions } from "@/components/common/row-actions";
import { StatusBadge } from "@/components/common/status-badge";
import { ImageThumb } from "@/components/common/image-thumb";
import { Money } from "@/components/common/money";
import type { Staff } from "@/types/models";

export default function StaffPage() {
  const { t } = useTranslation();
  const { openDialog } = useDialogManager();
  const confirmDelete = useConfirmDelete();
  const deleteStaff = useDeleteStaff();

  const [search, setSearch] = React.useState("");
  const debounced = useDebounce(search);
  const { data: staff = [], isLoading } = useStaff(debounced);

  const columns: Column<Staff>[] = [
    {
      key: "photo",
      header: "",
      headerClassName: "w-12",
      cell: (s) => <ImageThumb src={s.image_url} alt={s.name} />,
    },
    {
      key: "name",
      header: t("staff.staffName"),
      cell: (s) => (
        <span className="font-medium text-primary underline-offset-2 hover:underline">
          {s.name}
        </span>
      ),
    },
    {
      key: "phone",
      header: t("fields.phone"),
      cell: (s) => <span dir="ltr">{s.phone}</span>,
    },
    {
      key: "salary",
      header: t("staff.monthlySalary"),
      cell: (s) => <Money value={s.monthly_salary} />,
      className: "hidden sm:table-cell",
      headerClassName: "hidden sm:table-cell",
    },
    {
      key: "status",
      header: t("fields.status"),
      cell: (s) => (
        <StatusBadge
          tone={s.is_active ? "success" : "muted"}
          label={s.is_active ? t("staff.active") : t("staff.inactive")}
        />
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-24",
      cell: (s) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActions
            onEdit={() => openDialog(DialogKey.StaffForm, { staff: s })}
            onDelete={() =>
              confirmDelete({
                title: t("staff.deleteStaff"),
                description: t("staff.deleteWarning", { name: s.name }),
                onConfirm: () => deleteStaff.mutateAsync(s.id),
              })
            }
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t("staff.title")}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/staff/attendance">
                <CalendarCheck className="me-1 h-4 w-4" />
                {t("staff.attendance")}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/staff/salary">
                <Wallet className="me-1 h-4 w-4" />
                {t("staff.salaries")}
              </Link>
            </Button>
          </>
        }
      />
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("staff.searchStaff")}
        onNew={() => openDialog(DialogKey.StaffForm, null)}
        newLabel={t("staff.newStaff")}
      />
      <DataTable
        columns={columns}
        rows={staff}
        getRowId={(r) => r.id}
        loading={isLoading}
        emptyText={t("staff.empty")}
        onRowClick={(row) => openDialog(DialogKey.StaffDetail, { staff: row })}
      />
    </div>
  );
}
