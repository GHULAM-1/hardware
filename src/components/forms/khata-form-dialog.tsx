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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NumberField, TextareaField } from "@/components/forms/fields";
import { CustomerCombobox } from "@/components/common/customer-combobox";
import { DatePicker } from "@/components/common/date-picker";
import { ImageUpload } from "@/components/common/image-upload";
import { khataSchema, khataUpdateSchema, type KhataUpdateValues } from "@/lib/schemas";
import { todayISO, formatDate, formatPKR } from "@/lib/format";
import { IMAGE_FOLDER } from "@/lib/storage";
import { useCreateKhata, useUpdateKhata } from "@/hooks/use-khata";
import { useCustomerOrders } from "@/hooks/use-customers";
import type { KhataListView } from "@/types/models";

// Sentinel for the "no order attached" option (Select can't hold an empty value).
const NO_ORDER = "__none__";

export type KhataFormPayload = { khata?: KhataListView } | null;

export function KhataFormDialog({ payload, onClose }: DialogComponentProps<KhataFormPayload>) {
  const { t } = useTranslation();
  const khata = payload?.khata;
  const isEdit = Boolean(khata);
  // A reminder is a customer-less khata. Only those may submit without a customer;
  // a real khata keeps the customer required (khataSchema).
  const isReminder = Boolean(khata) && !khata?.customer;

  const create = useCreateKhata();
  const update = useUpdateKhata();
  const submitting = create.isPending || update.isPending;

  const form = useForm({
    resolver: zodResolver(isReminder ? khataUpdateSchema : khataSchema),
    defaultValues: {
      customer_id: khata?.customer?.id ?? "",
      amount: khata?.amount ?? 0,
      due_date: khata?.due_date ?? todayISO(),
      description: khata?.description ?? "",
      order_id: (khata?.order_id ?? null) as string | null,
      proof_url: (khata?.proof_url ?? null) as string | null,
    },
  });

  const customerId = useWatch({ control: form.control, name: "customer_id" });
  const { data: orders = [] } = useCustomerOrders(customerId || undefined);

  async function onSubmit(values: KhataUpdateValues) {
    try {
      if (isEdit && khata) {
        await update.mutateAsync({ id: khata.id, values });
        toast.success(t("toast.saved"));
      } else {
        await create.mutateAsync(values as Parameters<typeof create.mutateAsync>[0]);
        toast.success(t("toast.created"));
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.error"));
    }
  }

  return (
    <Form {...form}>
      <FormDialog
        title={isEdit ? t("khata.editEntry") : t("khata.newEntry")}
        onClose={onClose}
        onSubmit={form.handleSubmit(onSubmit)}
        submitting={submitting}
        submitLabel={isEdit ? t("common.save") : t("common.create")}
      >
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="customer_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fields.customer")}</FormLabel>
                <FormControl>
                  <CustomerCombobox
                    value={field.value || null}
                    onChange={(v) => {
                      field.onChange(v ?? "");
                      // A different customer's orders no longer apply.
                      form.setValue("order_id", null);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Optionally attach one of this customer's existing orders. */}
          {customerId && orders.length > 0 && (
            <FormField
              control={form.control}
              name="order_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("khata.attachOrder")}
                    <span className="ms-1 text-muted-foreground">({t("common.optional")})</span>
                  </FormLabel>
                  <Select
                    value={field.value ?? NO_ORDER}
                    onValueChange={(v) => {
                      if (v === NO_ORDER) {
                        field.onChange(null);
                        return;
                      }
                      field.onChange(v);
                      const picked = orders.find((o) => o.id === v);
                      if (picked) form.setValue("amount", picked.total);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("khata.attachOrder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_ORDER}>—</SelectItem>
                      {orders.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.order_no} · {formatPKR(o.total)} · {formatDate(o.created_at)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

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

          <TextareaField control={form.control} name="description" label={t("fields.note")} optional voice />

          {/* Or attach a proof/bill image instead of (or alongside) an order. */}
          <FormField
            control={form.control}
            name="proof_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("khata.proofImage")}
                  <span className="ms-1 text-muted-foreground">({t("common.optional")})</span>
                </FormLabel>
                <FormControl>
                  <ImageUpload
                    value={field.value ?? null}
                    onChange={(url) => field.onChange(url)}
                    folder={IMAGE_FOLDER.khata_proof}
                  />
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
