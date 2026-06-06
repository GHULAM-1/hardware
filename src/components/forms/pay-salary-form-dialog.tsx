"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { FormDialog } from "@/components/dialogs/form-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { NumberField, TextareaField } from "@/components/forms/fields";
import { DatePicker } from "@/components/common/date-picker";
import { Money } from "@/components/common/money";
import { salaryPaymentSchema, type SalaryPaymentValues } from "@/lib/schemas";
import { todayLocalISO } from "@/lib/format";
import { usePaySalary } from "@/hooks/use-salary";
import type { StaffSalaryRow } from "@/types/models";

export type PaySalaryPayload = { row: StaffSalaryRow; month: string };

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 py-1.5 text-sm">
      <span className="min-w-0 break-words text-muted-foreground">{label}</span>
      <span className="justify-self-end whitespace-nowrap font-medium">{children}</span>
    </div>
  );
}

export function PaySalaryFormDialog({ payload, onClose }: DialogComponentProps<PaySalaryPayload>) {
  const { t } = useTranslation();
  const { row, month } = payload;
  const pay = usePaySalary();

  const form = useForm({
    resolver: zodResolver(salaryPaymentSchema),
    defaultValues: {
      staff_id: row.staff.id,
      period_month: month,
      // When editing an already-paid month, prefill exactly what was recorded last
      // time. Otherwise suggest the net (the admin can change it — it's the final word).
      amount_paid: row.paid && row.amountPaid != null ? row.amountPaid : row.netPayable,
      paid_on: row.paid && row.paidOn ? row.paidOn : todayLocalISO(),
      note: row.paymentNote ?? "",
    },
  });

  async function onSubmit(values: SalaryPaymentValues) {
    try {
      await pay.mutateAsync(values);
      toast.success(t("staff.salaryPaid"));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.error"));
    }
  }

  return (
    <Form {...form}>
      <FormDialog
        title={`${t("staff.paySalary")} — ${row.staff.name}`}
        onClose={onClose}
        onSubmit={form.handleSubmit(onSubmit)}
        submitting={pay.isPending}
        submitLabel={t("staff.paySalary")}
      >
        <div className="space-y-4">
          {/* The calculation, shown as guidance. */}
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-2">
            <Line label={t("staff.monthlySalary")}>
              <Money value={row.staff.monthly_salary} />
            </Line>
            <Line label={`${t("staff.absenceDeduction")} (${row.absentDays} × ${t("staff.perDay")})`}>
              <span className="text-red-600">
                − <Money value={row.absenceDeduction} />
              </span>
            </Line>
            <Line label={t("staff.advancesTotal")}>
              <span className="text-red-600">
                − <Money value={row.advancesTotal} />
              </span>
            </Line>
            <div className="mt-1 flex items-center justify-between gap-4 border-t border-border pt-2 text-sm">
              <span className="font-semibold">{t("staff.suggestedNet")}</span>
              <span className="font-semibold">
                <Money value={row.netPayable} />
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">{t("staff.payHint")}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              control={form.control}
              name="amount_paid"
              label={`${t("staff.amountPaid")} (PKR)`}
              integer
            />
            <FormField
              control={form.control}
              name="paid_on"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("staff.paidOn")}</FormLabel>
                  <FormControl>
                    <DatePicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <TextareaField control={form.control} name="note" label={t("fields.note")} optional voice />
        </div>
      </FormDialog>
    </Form>
  );
}
