"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { FormDialog } from "@/components/dialogs/form-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { NumberField, TextareaField } from "@/components/forms/fields";
import { CustomerCombobox } from "@/components/common/customer-combobox";
import { DatePicker } from "@/components/common/date-picker";
import { khataSchema, type KhataValues } from "@/lib/schemas";
import { todayISO } from "@/lib/format";
import { useCreateKhata } from "@/hooks/use-khata";

export function KhataFormDialog({ onClose }: DialogComponentProps<null>) {
  const { t } = useTranslation();
  const create = useCreateKhata();

  const form = useForm({
    resolver: zodResolver(khataSchema),
    defaultValues: { customer_id: "", amount: 0, due_date: todayISO(), description: "" },
  });

  async function onSubmit(values: KhataValues) {
    try {
      await create.mutateAsync(values);
      toast.success(t("toast.created"));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.error"));
    }
  }

  return (
    <Form {...form}>
      <FormDialog
        title={t("khata.newEntry")}
        onClose={onClose}
        onSubmit={form.handleSubmit(onSubmit)}
        submitting={create.isPending}
        submitLabel={t("common.create")}
      >
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="customer_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fields.customer")}</FormLabel>
                <FormControl>
                  <CustomerCombobox value={field.value || null} onChange={(v) => field.onChange(v ?? "")} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField control={form.control} name="amount" label={`${t("fields.amount")} (PKR)`} />
            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.dueDate")}</FormLabel>
                  <FormControl>
                    <DatePicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <TextareaField control={form.control} name="description" label={t("fields.note")} optional />
        </div>
      </FormDialog>
    </Form>
  );
}
