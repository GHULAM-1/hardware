"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { FormDialog } from "@/components/dialogs/form-dialog";
import { Form } from "@/components/ui/form";
import { BilingualNameFields, ImageField, TextField, TextareaField } from "@/components/forms/fields";
import { customerSchema, type CustomerValues } from "@/lib/schemas";
import { useCreateCustomer, useUpdateCustomer } from "@/hooks/use-customers";
import type { Customer } from "@/types/models";

export type CustomerFormPayload = { customer?: Customer } | null;

export function CustomerFormDialog({ payload, onClose }: DialogComponentProps<CustomerFormPayload>) {
  const { t } = useTranslation();
  const customer = payload?.customer;
  const isEdit = Boolean(customer);

  const form = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name_en: customer?.name_en ?? "",
      name_ur: customer?.name_ur ?? "",
      phone: customer?.phone ?? "",
      email: customer?.email ?? "",
      address: customer?.address ?? "",
      image_url: customer?.image_url ?? null,
    },
  });

  const create = useCreateCustomer();
  const update = useUpdateCustomer();
  const submitting = create.isPending || update.isPending;

  async function onSubmit(values: CustomerValues) {
    try {
      if (isEdit && customer) await update.mutateAsync({ id: customer.id, values });
      else await create.mutateAsync(values);
      toast.success(t("toast.saved"));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.error"));
    }
  }

  return (
    <Form {...form}>
      <FormDialog
        title={isEdit ? t("customers.editCustomer") : t("customers.newCustomer")}
        onClose={onClose}
        onSubmit={form.handleSubmit(onSubmit)}
        submitting={submitting}
      >
        <div className="space-y-4">
          <BilingualNameFields control={form.control} enName="name_en" urName="name_ur" />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField control={form.control} name="phone" label={t("fields.phone")} dir="ltr" optional />
            <TextField control={form.control} name="email" label={t("fields.email")} type="email" dir="ltr" optional />
          </div>
          <TextareaField control={form.control} name="address" label={t("fields.address")} optional />
          <ImageField control={form.control} name="image_url" label={t("fields.image")} folder="customer" />
        </div>
      </FormDialog>
    </Form>
  );
}
