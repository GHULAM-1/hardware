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
import { salaryAdvanceSchema, type SalaryAdvanceValues } from "@/lib/schemas";
import { todayLocalISO } from "@/lib/format";
import { useCreateAdvance } from "@/hooks/use-salary";

export type SalaryAdvancePayload = { staffId: string; staffName: string };

export function SalaryAdvanceFormDialog({
  payload,
  onClose,
}: DialogComponentProps<SalaryAdvancePayload>) {
  const { t } = useTranslation();
  const create = useCreateAdvance();

  const form = useForm({
    resolver: zodResolver(salaryAdvanceSchema),
    defaultValues: {
      staff_id: payload.staffId,
      amount: 0,
      advance_date: todayLocalISO(),
      note: "",
    },
  });

  async function onSubmit(values: SalaryAdvanceValues) {
    try {
      await create.mutateAsync(values);
      toast.success(t("staff.advanceSaved"));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.error"));
    }
  }

  return (
    <Form {...form}>
      <FormDialog
        title={`${t("staff.addAdvance")} — ${payload.staffName}`}
        onClose={onClose}
        onSubmit={form.handleSubmit(onSubmit)}
        submitting={create.isPending}
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              control={form.control}
              name="amount"
              label={`${t("fields.amount")} (PKR)`}
              integer
            />
            <FormField
              control={form.control}
              name="advance_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.date")}</FormLabel>
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
