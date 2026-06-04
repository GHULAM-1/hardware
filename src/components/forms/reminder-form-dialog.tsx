"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { FormDialog } from "@/components/dialogs/form-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { TextareaField } from "@/components/forms/fields";
import { DatePicker } from "@/components/common/date-picker";
import { reminderSchema, type ReminderValues } from "@/lib/schemas";
import { todayISO } from "@/lib/format";
import { useCreateReminder } from "@/hooks/use-khata";

/** Create a standalone reminder (no customer, no amount) — note + due date. */
export function ReminderFormDialog({ onClose }: DialogComponentProps<null>) {
  const { t } = useTranslation();
  const create = useCreateReminder();

  const form = useForm({
    resolver: zodResolver(reminderSchema),
    defaultValues: { description: "", due_date: todayISO() },
  });

  async function onSubmit(values: ReminderValues) {
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
        title={t("khata.newReminder")}
        onClose={onClose}
        onSubmit={form.handleSubmit(onSubmit)}
        submitting={create.isPending}
        submitLabel={t("common.create")}
      >
        <div className="space-y-4">
          <TextareaField control={form.control} name="description" label={t("khata.reminderNote")} />
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
      </FormDialog>
    </Form>
  );
}
