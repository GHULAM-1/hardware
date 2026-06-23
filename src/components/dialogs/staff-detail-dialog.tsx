"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Wallet } from "lucide-react";

import { Icon3D } from "@/components/ui/icon-3d";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { DialogKey } from "@/lib/dialog-keys";
import { useStaffSalary } from "@/hooks/use-salary";
import { useStaffAbsentDates } from "@/hooks/use-attendance";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageThumb } from "@/components/common/image-thumb";
import { StatusBadge } from "@/components/common/status-badge";
import { Money } from "@/components/common/money";
import { formatCnic, formatDate, formatTime, monthKeyLocal, todayLocalISO } from "@/lib/format";
import type { Staff } from "@/types/models";

export type StaffDetailPayload = { staff: Staff };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-end text-sm font-medium">{children}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 mt-4 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

function currentMonthLabel(): string {
  const [y, m] = monthKeyLocal().split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    new Date(y, m - 1, 1),
  );
}

export function StaffDetailDialog({ payload, onClose }: DialogComponentProps<StaffDetailPayload>) {
  const { t } = useTranslation();
  const { openDialog } = useDialogManager();
  const { staff } = payload;

  // This month's live picture (attendance + advances + salary status) — reuses the
  // same computation the salary slip uses, so no extra server code is needed.
  const month = monthKeyLocal();
  const { data: salary, isLoading } = useStaffSalary(staff.id, month);
  const { data: absentDates, isLoading: absentLoading } = useStaffAbsentDates(staff.id, month);

  // Today's check-in / check-out, pulled from this month's attendance log.
  const todayRow = salary?.attendance.find((a) => a.date === todayLocalISO());
  const todayTiming =
    todayRow && (todayRow.entry_time || todayRow.exit_time)
      ? `${formatTime(todayRow.entry_time)} – ${formatTime(todayRow.exit_time)}`
      : "—";

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto overflow-x-hidden sm:max-w-md">
        <DialogHeader className="min-w-0">
          <DialogTitle className="flex items-center gap-3 break-words pe-6">
            <ImageThumb src={staff.image_url} alt={staff.name} className="h-12 w-12" />
            <span className="min-w-0 flex-1">
              <span className="block break-words">{staff.name}</span>
              <StatusBadge
                tone={staff.is_active ? "success" : "muted"}
                label={staff.is_active ? t("staff.active") : t("staff.inactive")}
              />
            </span>
          </DialogTitle>
        </DialogHeader>

        <SectionLabel>{t("staff.personalDetails")}</SectionLabel>
        <div className="rounded-lg border border-border bg-card px-4 py-1">
          <Field label={t("fields.phone")}>
            <span dir="ltr">{staff.phone}</span>
          </Field>
          <Field label={t("staff.cnic")}>
            {staff.cnic ? <span dir="ltr">{formatCnic(staff.cnic)}</span> : "—"}
          </Field>
          <Field label={t("fields.address")}>{staff.address ?? "—"}</Field>
          <Field label={t("staff.joinedOn")}>{formatDate(staff.joined_on)}</Field>
        </div>

        <SectionLabel>{t("staff.attendanceThisMonth", { month: currentMonthLabel() })}</SectionLabel>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <div className="mb-3 flex items-center justify-between gap-4 border-b border-border pb-3">
            <span className="text-sm text-muted-foreground">{t("staff.todayTiming")}</span>
            {isLoading ? (
              <Skeleton className="h-5 w-28" />
            ) : (
              <span className="text-sm font-medium" dir="ltr">
                {todayTiming}
              </span>
            )}
          </div>
          {absentLoading ? (
            <Skeleton className="h-5 w-2/3" />
          ) : !absentDates || absentDates.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("staff.noAbsences")}</p>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">{t("staff.absentOn")}</span>
                <span className="text-sm font-medium">{absentDates.length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {absentDates.map((d) => (
                  <StatusBadge key={d} tone="danger" label={formatDate(d)} />
                ))}
              </div>
            </>
          )}
        </div>

        <SectionLabel>{t("staff.thisMonth", { month: currentMonthLabel() })}</SectionLabel>
        <div className="rounded-lg border border-border bg-card px-4 py-1">
          <Field label={t("staff.monthlySalary")}>
            <Money value={staff.monthly_salary} />
          </Field>
          {isLoading || !salary ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-2/3" />
            </div>
          ) : (
            <>
              <Field label={t("staff.absentDays")}>{salary.absentDays}</Field>
              <Field label={t("staff.advancesTotal")}>
                <Money value={salary.advancesTotal} />
              </Field>
              <Field label={salary.paid ? t("staff.net") : t("staff.suggestedNet")}>
                <Money value={salary.netPayable} className="font-semibold" />
              </Field>
              <Field label={t("fields.status")}>
                {salary.paid ? (
                  <StatusBadge tone="success" label={t("staff.paid")} />
                ) : (
                  <StatusBadge tone="warning" label={t("staff.unpaid")} />
                )}
              </Field>
            </>
          )}
        </div>

        <DialogFooter className="mt-2 gap-2 sm:gap-2">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/staff/salary" onClick={onClose}>
              <Wallet className="me-1 h-4 w-4" />
              {t("staff.viewSalary")}
            </Link>
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => openDialog(DialogKey.StaffForm, { staff })}
          >
            <Icon3D name="pencil" size={24} className="-ms-1 me-1" alt="" />
            {t("staff.editStaff")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
