"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, Check, X } from "lucide-react";

import { useAttendance, useSaveAttendance } from "@/hooks/use-attendance";
import { StaffAttendanceStatus } from "@/lib/enums";
import { todayLocalISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { DatePicker } from "@/components/common/date-picker";
import { Button } from "@/components/ui/button";
import { ImageThumb } from "@/components/common/image-thumb";

type Mark = typeof StaffAttendanceStatus.Present | typeof StaffAttendanceStatus.Absent;

export default function AttendancePage() {
  const { t } = useTranslation();
  const [date, setDate] = React.useState(() => todayLocalISO());
  const { data: rows = [], isLoading } = useAttendance(date);
  const save = useSaveAttendance();

  // The displayed mark is derived: an unsaved override if the user tapped it,
  // else the server's mark, else "present" (the default). No state-sync effect.
  const [overrides, setOverrides] = React.useState<Record<string, Mark>>({});
  const dirty = Object.keys(overrides).length > 0;

  const markOf = (staffId: string, serverStatus: Mark | null): Mark =>
    overrides[staffId] ?? serverStatus ?? StaffAttendanceStatus.Present;

  function changeDate(d: string) {
    setDate(d);
    setOverrides({}); // discard unsaved taps when switching day
  }

  // Warn before leaving with unsaved changes (tab close / reload).
  React.useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function setMark(staffId: string, status: Mark) {
    setOverrides((m) => ({ ...m, [staffId]: status }));
  }

  async function onSave() {
    const entries = rows.map((r) => ({
      staff_id: r.staff.id,
      status: markOf(r.staff.id, r.status as Mark | null),
    }));
    if (!entries.length) return;
    try {
      await save.mutateAsync({ date, entries });
      setOverrides({});
      toast.success(t("staff.attendanceSaved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.error"));
    }
  }

  return (
    <div className="pb-24">
      <Button asChild variant="ghost" size="sm" className="-ms-2 mb-2 text-white/80 hover:text-white">
        <Link href="/staff">
          <ArrowLeft className="me-1 h-4 w-4 rtl:rotate-180" />
          {t("staff.title")}
        </Link>
      </Button>
      <PageHeader title={t("staff.todaysAttendance")} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <DatePicker value={date} onChange={changeDate} className="w-48" />
        <p className="text-sm font-medium text-white/80">{t("staff.presentNote")}</p>
      </div>

      {isLoading ? (
        <p className="text-sm font-medium text-white/80">{t("common.loading")}</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-white/20 p-6 text-center text-sm font-medium text-white/80">
          {t("staff.noActiveStaff")}
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const current = markOf(r.staff.id, r.status as Mark | null);
            const present = current === StaffAttendanceStatus.Present;
            const toggle = () =>
              setMark(
                r.staff.id,
                present ? StaffAttendanceStatus.Absent : StaffAttendanceStatus.Present,
              );
            return (
              <button
                key={r.staff.id}
                type="button"
                onClick={toggle}
                aria-pressed={present}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border p-3 text-start transition-colors",
                  present
                    ? "border-emerald-600/40 bg-emerald-50 dark:bg-emerald-950/30"
                    : "border-red-600/40 bg-red-50 dark:bg-red-950/30",
                )}
              >
                <ImageThumb src={r.staff.image_url} alt={r.staff.name} className="h-11 w-11" />
                <span className="min-w-0 flex-1 truncate font-medium">{r.staff.name}</span>
                <span
                  className={cn(
                    "text-sm font-medium",
                    present ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400",
                  )}
                >
                  {present ? t("staff.present") : t("staff.absent")}
                </span>
                {/* The checkbox: green & ticked = present (default); tap turns it red = absent. */}
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border-2",
                    present
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-red-600 bg-red-600 text-white",
                  )}
                >
                  {present ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {rows.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 mr-16">
            <span className="min-w-0 truncate text-sm text-muted-foreground">
              {dirty ? t("staff.unsavedChanges") : ""}
            </span>
            <Button
              size="lg"
              className="shrink-0 bg-emerald-600 hover:bg-emerald-600/90"
              onClick={onSave}
              disabled={save.isPending}
            >
              <Check className="me-1 h-5 w-5" />
              {t("staff.saveAttendance")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
