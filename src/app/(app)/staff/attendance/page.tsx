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
import { TimePicker } from "@/components/common/time-picker";
import { Button } from "@/components/ui/button";
import { ImageThumb } from "@/components/common/image-thumb";
import type { AttendanceRow } from "@/types/models";

type Mark = typeof StaffAttendanceStatus.Present | typeof StaffAttendanceStatus.Absent;
type TimeField = "entry" | "exit";

/** Postgres `time` comes back as "HH:MM:SS"; the time input wants "HH:MM". */
const hhmm = (s: string | null) => (s ? s.slice(0, 5) : "");

export default function AttendancePage() {
  const { t } = useTranslation();
  const [date, setDate] = React.useState(() => todayLocalISO());
  const { data: rows = [], isLoading } = useAttendance(date);
  const save = useSaveAttendance();

  // The displayed mark is derived: an unsaved override if the user tapped it,
  // else the server's mark, else "present" (the default). No state-sync effect.
  const [overrides, setOverrides] = React.useState<Record<string, Mark>>({});
  // Same idea for entry/exit times: an override per staff, else the saved value.
  const [times, setTimes] = React.useState<Record<string, { entry: string; exit: string }>>({});
  const dirty = Object.keys(overrides).length > 0 || Object.keys(times).length > 0;

  const markOf = (staffId: string, serverStatus: Mark | null): Mark =>
    overrides[staffId] ?? serverStatus ?? StaffAttendanceStatus.Present;

  const timesOf = (r: AttendanceRow) =>
    times[r.staff.id] ?? { entry: hhmm(r.entry_time), exit: hhmm(r.exit_time) };

  function changeDate(d: string) {
    setDate(d);
    setOverrides({}); // discard unsaved taps when switching day
    setTimes({});
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

  function setTime(r: AttendanceRow, field: TimeField, value: string) {
    setTimes((m) => {
      const base = m[r.staff.id] ?? { entry: hhmm(r.entry_time), exit: hhmm(r.exit_time) };
      return { ...m, [r.staff.id]: { ...base, [field]: value } };
    });
  }

  async function onSave() {
    const entries = rows.map((r) => {
      const status = markOf(r.staff.id, r.status as Mark | null);
      const present = status === StaffAttendanceStatus.Present;
      const tt = timesOf(r);
      return {
        staff_id: r.staff.id,
        status,
        entry_time: present && tt.entry ? tt.entry : null,
        exit_time: present && tt.exit ? tt.exit : null,
      };
    });
    if (!entries.length) return;
    try {
      await save.mutateAsync({ date, entries });
      setOverrides({});
      setTimes({});
      toast.success(t("staff.attendanceSaved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.error"));
    }
  }

  return (
    <div className="pb-24">
      <Button asChild variant="ghost" size="sm" className="-ms-2 mb-2 text-white/80 hover:bg-white/15 hover:text-white">
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
            const tt = timesOf(r);
            const toggle = () =>
              setMark(
                r.staff.id,
                present ? StaffAttendanceStatus.Absent : StaffAttendanceStatus.Present,
              );
            return (
              <div
                key={r.staff.id}
                className={cn(
                  "rounded-lg border transition-colors",
                  present
                    ? "border-emerald-600/40 bg-emerald-50 dark:bg-emerald-950/30"
                    : "border-red-600/40 bg-red-50 dark:bg-red-950/30",
                )}
              >
                {/* Tap anywhere on this row to toggle present/absent. */}
                <button
                  type="button"
                  onClick={toggle}
                  aria-pressed={present}
                  className="flex w-full items-center gap-3 p-3 text-start"
                >
                  <ImageThumb src={r.staff.image_url} alt={r.staff.name} className="h-11 w-11" />
                  <span className="min-w-0 flex-1 truncate font-medium">{r.staff.name}</span>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      present
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-red-700 dark:text-red-400",
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

                {/* Entry / exit times — only for a present day (optional). */}
                {present ? (
                  <div className="grid grid-cols-2 gap-3 border-t border-emerald-600/20 px-3 pb-3 pt-3">
                    <div className="space-y-1">
                      <span className="block text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                        {t("staff.entryTime")}
                      </span>
                      <TimePicker value={tt.entry} onChange={(v) => setTime(r, "entry", v)} />
                    </div>
                    <div className="space-y-1">
                      <span className="block text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                        {t("staff.exitTime")}
                      </span>
                      <TimePicker value={tt.exit} onChange={(v) => setTime(r, "exit", v)} />
                    </div>
                  </div>
                ) : null}
              </div>
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
