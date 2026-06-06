"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Trash2, Wallet, Plus, Printer, Download, Loader2 } from "lucide-react";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { DialogKey } from "@/lib/dialog-keys";
import { useStaffSalary, useDeleteAdvance } from "@/hooks/use-salary";
import { useLanguage } from "@/providers/i18n-provider";
import { Language } from "@/lib/enums";
import { formatDate } from "@/lib/format";
import { printElement, downloadElementPdf } from "@/lib/print-export";
import { PayslipSheet } from "@/components/staff/payslip-sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/common/status-badge";
import { Money } from "@/components/common/money";
import { cn } from "@/lib/utils";

export type SalarySlipPayload = { staffId: string; staffName: string; month: string };

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    new Date(y, m - 1, 1),
  );
}

/**
 * One receipt line: label can shrink/wrap (min-w-0), amount never wraps and keeps
 * its width (auto column). This grid is what prevents horizontal overflow on phones.
 */
function Row({
  label,
  children,
  strong,
  negative,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  strong?: boolean;
  negative?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_auto] items-center gap-3 py-1.5 text-sm",
        strong && "font-semibold",
      )}
    >
      <span className={cn("min-w-0 break-words", !strong && "text-muted-foreground")}>{label}</span>
      <span className={cn("justify-self-end whitespace-nowrap", negative && "text-red-600")}>
        {children}
      </span>
    </div>
  );
}

export function SalarySlipDialog({ payload, onClose }: DialogComponentProps<SalarySlipPayload>) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { openDialog } = useDialogManager();
  const deleteAdvance = useDeleteAdvance();
  const { staffId, staffName, month } = payload;
  const { data, isLoading } = useStaffSalary(staffId, month);

  const sheetRef = React.useRef<HTMLDivElement | null>(null);
  const [pdfBusy, setPdfBusy] = React.useState(false);
  // Which advance is awaiting an inline delete-confirm (kept in-slip so the slip
  // never closes — the global DialogManager only holds one dialog at a time).
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);

  function onPrint() {
    if (!sheetRef.current) return;
    printElement(sheetRef.current, {
      title: `${staffName} — ${month}`,
      rtl: language === Language.Urdu,
    });
  }

  async function onDownloadPdf() {
    if (!sheetRef.current) return;
    setPdfBusy(true);
    try {
      await downloadElementPdf(sheetRef.current, `payslip-${staffName}-${month}.pdf`);
    } catch {
      toast.error(t("staff.pdfFailed"));
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto overflow-x-hidden sm:max-w-lg">
        <DialogHeader className="min-w-0">
          <DialogTitle className="grid grid-cols-[1fr_auto] items-center gap-2 pe-6">
            <span className="min-w-0 truncate">{staffName}</span>
            <span className="shrink-0 whitespace-nowrap text-sm font-normal text-muted-foreground">
              {monthLabel(month)}
            </span>
          </DialogTitle>
        </DialogHeader>

        {isLoading || !data ? (
          <div className="space-y-2 py-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-2/3" />
          </div>
        ) : (
          <>
            <div className="min-w-0 rounded-lg border border-border bg-card px-4 py-2">
              <Row label={t("staff.monthlySalary")}>
                <Money value={data.staff.monthly_salary} />
              </Row>

              <Row
                label={
                  <span className="break-words">
                    {t("staff.absenceDeduction")}{" "}
                    <span className="whitespace-nowrap text-xs">
                      ({data.absentDays} × <Money value={data.perDay} className="text-xs" />)
                    </span>
                  </span>
                }
                negative
              >
                − <Money value={data.absenceDeduction} />
              </Row>

              {/* Advances breakdown — each advance is its own tidy card so the date,
                  amount and (full) note never collide, on phone or laptop. */}
              <div className="border-t border-dashed border-border py-2">
                <div className="mb-2 text-sm font-medium text-muted-foreground">
                  {t("staff.advances")}
                </div>
                {data.advances.length === 0 ? (
                  <div className="text-xs text-muted-foreground">{t("staff.noAdvances")}</div>
                ) : (
                  <ul className="space-y-2">
                    {data.advances.map((a) => (
                      <li
                        key={a.id}
                        className="rounded-md border border-border bg-muted/40 p-2.5 text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium">{formatDate(a.advance_date)}</span>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="whitespace-nowrap font-medium text-red-600">
                              − <Money value={a.amount} />
                            </span>
                            {!data.paid && confirmingId !== a.id ? (
                              <button
                                type="button"
                                aria-label={t("staff.deleteAdvance")}
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => setConfirmingId(a.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>
                        </div>
                        {a.note ? (
                          <p className="mt-1 break-words text-muted-foreground">
                            <span className="font-medium">{t("fields.note")}: </span>
                            {a.note}
                          </p>
                        ) : null}

                        {/* Inline confirm — stays inside the slip, so confirming or
                            cancelling never closes the slip dialog. */}
                        {confirmingId === a.id ? (
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-destructive/10 px-2.5 py-2">
                            <span className="text-xs font-medium text-destructive">
                              {t("staff.deleteAdvanceConfirm")}
                            </span>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setConfirmingId(null)}
                                disabled={deleteAdvance.isPending}
                              >
                                {t("common.cancel")}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                disabled={deleteAdvance.isPending}
                                onClick={async () => {
                                  try {
                                    await deleteAdvance.mutateAsync(a.id);
                                  } finally {
                                    setConfirmingId(null);
                                  }
                                }}
                              >
                                {deleteAdvance.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="me-1 h-4 w-4" />
                                )}
                                {t("staff.remove")}
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
                <Row label={t("staff.advancesTotal")} negative>
                  − <Money value={data.advancesTotal} />
                </Row>
              </div>

              <div className="mt-1 grid grid-cols-[1fr_auto] items-center gap-3 border-t border-border pt-3 text-base font-semibold">
                <span className="min-w-0 break-words">
                  {data.paid ? t("staff.net") : t("staff.suggestedNet")}
                </span>
                <span className="justify-self-end whitespace-nowrap">
                  <Money value={data.netPayable} />
                </span>
              </div>

              {data.paid ? (
                <div className="mt-1 rounded-md bg-emerald-50 px-3 py-2 dark:bg-emerald-950/30">
                  <Row label={t("staff.amountPaid")} strong>
                    <Money value={data.amountPaid} />
                  </Row>
                  <Row label={t("staff.paidOn")}>{formatDate(data.paidOn)}</Row>
                  <div className="pt-1">
                    <StatusBadge tone="success" label={t("staff.paid")} />
                  </div>
                </div>
              ) : null}
            </div>

            {/* Print / PDF of the payslip (uses the same shop header as receipts). */}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onPrint}>
                <Printer className="me-1 h-4 w-4" />
                {t("staff.print")}
              </Button>
              <Button variant="outline" size="sm" onClick={onDownloadPdf} disabled={pdfBusy}>
                {pdfBusy ? (
                  <Loader2 className="me-1 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="me-1 h-4 w-4" />
                )}
                {t("staff.downloadPdf")}
              </Button>
            </div>

            {/* Off-screen printable sheet captured by Print/PDF (kept out of the
                visible layout so the responsive on-screen breakdown above stays). */}
            <div aria-hidden className="pointer-events-none absolute -left-[9999px] top-0 w-[520px]">
              <PayslipSheet ref={sheetRef} detail={data} month={month} />
            </div>

            <DialogFooter className="min-w-0">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => openDialog(DialogKey.SalaryAdvanceForm, { staffId, staffName })}
              >
                <Plus className="me-1 h-4 w-4" />
                {t("staff.addAdvance")}
              </Button>
              <Button
                className="w-full sm:w-auto"
                onClick={() =>
                  openDialog(DialogKey.PaySalaryForm, {
                    row: {
                      staff: data.staff,
                      daysInMonth: data.daysInMonth,
                      absentDays: data.absentDays,
                      perDay: data.perDay,
                      absenceDeduction: data.absenceDeduction,
                      advancesTotal: data.advancesTotal,
                      netPayable: data.netPayable,
                      paid: data.paid,
                      amountPaid: data.amountPaid,
                      paidOn: data.paidOn,
                      paymentNote: data.paymentNote,
                    },
                    month,
                  })
                }
              >
                <Wallet className="me-1 h-4 w-4" />
                {data.paid ? t("common.edit") : t("staff.paySalary")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
