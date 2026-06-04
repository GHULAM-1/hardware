"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { FormDialog } from "@/components/dialogs/form-dialog";
import { Form } from "@/components/ui/form";
import { TextField, TextareaField } from "@/components/forms/fields";
import { supplierSchema, type SupplierValues } from "@/lib/schemas";
import { useCreateSupplier, useUpdateSupplier } from "@/hooks/use-suppliers";
import type { Supplier } from "@/types/models";

export type SupplierFormPayload = { supplier?: Supplier } | null;

export function SupplierFormDialog({ payload, onClose }: DialogComponentProps<SupplierFormPayload>) {
  const { t } = useTranslation();
  const supplier = payload?.supplier;
  const isEdit = Boolean(supplier);

  const form = useForm({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: supplier?.name ?? "",
      phone: supplier?.phone ?? "",
      note: supplier?.note ?? "",
    },
  });

  const create = useCreateSupplier();
  const update = useUpdateSupplier();
  const submitting = create.isPending || update.isPending;

  async function onSubmit(values: SupplierValues) {
    try {
      if (isEdit && supplier) await update.mutateAsync({ id: supplier.id, values });
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
        title={isEdit ? t("suppliers.editSupplier") : t("suppliers.newSupplier")}
        onClose={onClose}
        onSubmit={form.handleSubmit(onSubmit)}
        submitting={submitting}
      >
        <div className="space-y-4">
          <TextField control={form.control} name="name" label={t("fields.name")} />
          <TextField control={form.control} name="phone" label={t("fields.phone")} dir="ltr" optional />
          <TextareaField control={form.control} name="note" label={t("fields.note")} optional />
        </div>
      </FormDialog>
    </Form>
  );
}
