"use client";

import { useForm, useWatch } from "react-hook-form";
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
import { NumberField } from "@/components/forms/fields";
import { DatePicker } from "@/components/common/date-picker";
import { Money } from "@/components/common/money";
import { PaymentType } from "@/lib/enums";
import { orderPaymentSchema, type OrderPaymentValues } from "@/lib/schemas";
import { todayISO } from "@/lib/format";
import { useUpdateOrderPayment } from "@/hooks/use-orders";
import type { OrderListView } from "@/types/models";

export type OrderEditPayload = { order: OrderListView };

export function OrderEditDialog({ payload, onClose }: DialogComponentProps<OrderEditPayload>) {
  const { t } = useTranslation();
  const { order } = payload;
  const isPartial = order.payment_type === PaymentType.Partial;
  const update = useUpdateOrderPayment();

  const form = useForm({
    resolver: zodResolver(orderPaymentSchema),
    defaultValues: {
      amount_paid: order.amount_paid ?? 0,
      due_date: order.due_date ?? todayISO(),
    },
  });

  const amountPaid = useWatch({ control: form.control, name: "amount_paid" });
  const balance = Math.max(Number(order.total) - (isPartial ? Number(amountPaid) || 0 : 0), 0);

  async function onSubmit(values: OrderPaymentValues) {
    try {
      await update.mutateAsync({ id: order.id, values });
      toast.success(t("toast.saved"));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.error"));
    }
  }

  return (
    <Form {...form}>
      <FormDialog
        title={`${t("orders.editPayment")} · ${order.order_no}`}
        onClose={onClose}
        onSubmit={form.handleSubmit(onSubmit)}
        submitting={update.isPending}
      >
        <div className="space-y-4">
          <div className="flex justify-between rounded-md bg-secondary px-3 py-2 text-sm">
            <span className="text-muted-foreground">{t("orders.total")}</span>
            <Money value={order.total} className="font-semibold" />
          </div>

          {isPartial && (
            <NumberField control={form.control} name="amount_paid" label={`${t("fields.amountPaid")} (PKR)`} />
          )}

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

          <div className="flex justify-between border-t border-border pt-3 text-sm font-medium text-destructive">
            <span>{t("fields.balanceDue")}</span>
            <Money value={balance} />
          </div>
        </div>
      </FormDialog>
    </Form>
  );
}
