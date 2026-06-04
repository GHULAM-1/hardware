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
import { BilingualNameFields, ImageField, NumberField } from "@/components/forms/fields";
import { UnitSelect } from "@/components/common/unit-select";
import { itemSchema, type ItemValues } from "@/lib/schemas";
import { useCreateItem, useUpdateItem } from "@/hooks/use-items";
import type { Item } from "@/types/models";

export type ItemFormPayload = { item?: Item } | null;

export function ItemFormDialog({ payload, onClose }: DialogComponentProps<ItemFormPayload>) {
  const { t } = useTranslation();
  const item = payload?.item;
  const isEdit = Boolean(item);

  const form = useForm({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name_en: item?.name_en ?? "",
      name_ur: item?.name_ur ?? "",
      unit: item?.unit ?? "pcs",
      selling_price: item?.selling_price ?? 0,
      category_id: item?.category_id ?? null,
      image_url: item?.image_url ?? null,
    },
  });

  const create = useCreateItem();
  const update = useUpdateItem();
  const submitting = create.isPending || update.isPending;

  async function onSubmit(values: ItemValues) {
    try {
      if (isEdit && item) await update.mutateAsync({ id: item.id, values });
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
        title={isEdit ? t("pricing.editItem") : t("pricing.newItem")}
        onClose={onClose}
        onSubmit={form.handleSubmit(onSubmit)}
        submitting={submitting}
      >
        <div className="space-y-4">
          <BilingualNameFields control={form.control} enName="name_en" urName="name_ur" />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.unit")}</FormLabel>
                  <FormControl>
                    <UnitSelect value={field.value ?? "pcs"} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <NumberField control={form.control} name="selling_price" label={`${t("fields.sellingPrice")} (PKR)`} />
          </div>
          <ImageField control={form.control} name="image_url" label={t("fields.image")} folder="product" />
          {isEdit && item && (
            <p className="text-xs text-muted-foreground">
              {t("fields.sku")}: <span className="font-mono">{item.sku}</span>
            </p>
          )}
        </div>
      </FormDialog>
    </Form>
  );
}
