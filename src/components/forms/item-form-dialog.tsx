"use client";

import * as React from "react";
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
} from "@/components/ui/form";
import { BilingualNameFields, ImagesField } from "@/components/forms/fields";
import { MeasurementFields } from "@/components/forms/measurement-fields";
import { StockInFields, useStockIn } from "@/components/forms/stock-in-section";
import { Switch } from "@/components/ui/switch";
import { MeasurementType, StockEntryType } from "@/lib/enums";
import { fromBase } from "@/lib/units";
import { itemSchema, type ItemInput, type ItemValues } from "@/lib/schemas";
import { useCreateItem, useUpdateItem } from "@/hooks/use-items";
import { useStockEntries } from "@/hooks/use-warehouse";
import type { Item } from "@/types/models";

export type ItemFormPayload = { item?: Item } | null;

export function ItemFormDialog({ payload, onClose }: DialogComponentProps<ItemFormPayload>) {
  const { t } = useTranslation();
  const item = payload?.item;
  const isEdit = Boolean(item);

  const form = useForm<ItemInput, unknown, ItemValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name_en: item?.name_en ?? "",
      name_ur: item?.name_ur ?? "",
      measurement_type: item?.measurement_type ?? MeasurementType.Count,
      primary_unit: item?.primary_unit ?? "piece",
      base_unit: item?.base_unit ?? "piece",
      base_per_primary: item?.base_per_primary ?? 1,
      selling_price: item?.selling_price ?? ("" as unknown as number),
      low_stock_threshold: item?.low_stock_threshold ?? "",
      category_id: item?.category_id ?? null,
      image_urls: item?.image_urls ?? [],
      track_in_warehouse: item?.track_in_warehouse ?? false,
    },
  });

  // Prefill the stock section from the item: current quantity (so it shows + can be
  // set directly) plus supplier + buying price from its most recent purchase.
  const { data: entries } = useStockEntries(item?.id);
  const lastIn = entries?.find((e) => e.type === StockEntryType.In);
  const currentBase = (entries ?? []).reduce(
    (sum, e) => sum + (e.type === StockEntryType.In ? Number(e.quantity) : -Number(e.quantity)),
    0,
  );
  const itemFactor = item?.base_per_primary ?? 1;
  const stockSeed = React.useMemo(
    () =>
      item && entries
        ? {
            supplierId: lastIn?.supplier_id ?? null,
            buyingPrice: lastIn?.buying_price != null ? String(lastIn.buying_price) : "",
            qty: String(fromBase(currentBase, itemFactor)),
          }
        : undefined,
    [item, entries, lastIn, currentBase, itemFactor],
  );

  const create = useCreateItem();
  const update = useUpdateItem();
  const stock = useStockIn(stockSeed);
  const submitting = create.isPending || update.isPending || stock.committing;

  const primaryUnit = useWatch({ control: form.control, name: "primary_unit" });
  const unitLabel = primaryUnit ? t(`units.${primaryUnit}`) : "";

  async function onSubmit(values: ItemValues) {
    try {
      // Recording a purchase here implies the item is warehouse-managed.
      const payload = { ...values, track_in_warehouse: values.track_in_warehouse || stock.hasStock };
      const saved =
        isEdit && item
          ? await update.mutateAsync({ id: item.id, values: payload })
          : await create.mutateAsync(payload);
      // Edit: SET stock to the entered quantity (balancing adjustment vs current).
      await stock.commitSet(saved.id, itemFactor, currentBase);
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
        dirty={stock.dirty}
      >
        <div className="space-y-4">
          <BilingualNameFields control={form.control} enName="name_en" urName="name_ur" />
          <MeasurementFields />
          <ImagesField control={form.control} name="image_urls" label={t("fields.image")} folder="product" />
          <StockInFields
            stock={stock}
            unitLabel={unitLabel}
            title={t("warehouse.currentStock")}
            hint={t("items.currentStockHint")}
          />
          <FormField
            control={form.control}
            name="track_in_warehouse"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-4 rounded-lg border border-border bg-secondary/40 p-3">
                <div className="min-w-0 space-y-0.5">
                  <FormLabel>{t("items.trackInWarehouse")}</FormLabel>
                  <p className="text-xs text-muted-foreground">{t("items.trackInWarehouseHint")}</p>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </FormDialog>
    </Form>
  );
}
