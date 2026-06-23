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
} from "@/components/ui/form";
import { BilingualNameFields, ImagesField } from "@/components/forms/fields";
import { MeasurementFields } from "@/components/forms/measurement-fields";
import { StockInFields, useStockIn } from "@/components/forms/stock-in-section";
import { Switch } from "@/components/ui/switch";
import { MeasurementType } from "@/lib/enums";
import { itemSchema, type ItemInput, type ItemValues } from "@/lib/schemas";
import { useCreateItem } from "@/hooks/use-items";

/**
 * Create a catalog item: name, measurement model (type → unit → pieces-per-pack),
 * selling price (per primary unit), images, and an optional initial-stock section
 * (supplier — with inline "+ add new supplier" — quantity + buying price + date).
 * Recording initial stock turns on warehouse tracking, since stock lives only on
 * tracked items. With no initial stock, use the "Track in warehouse" toggle.
 */
export function ItemCreateDialog({ onClose }: DialogComponentProps<null>) {
  const { t } = useTranslation();
  const createItem = useCreateItem();
  const stock = useStockIn();

  const form = useForm<ItemInput, unknown, ItemValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name_en: "",
      name_ur: "",
      measurement_type: MeasurementType.Count,
      primary_unit: "piece",
      base_unit: "piece",
      base_per_primary: 1,
      selling_price: "" as unknown as number,
      low_stock_threshold: "",
      category_id: null,
      image_urls: [],
      track_in_warehouse: false,
    },
  });

  const primaryUnit = useWatch({ control: form.control, name: "primary_unit" });
  const unitLabel = primaryUnit ? t(`units.${primaryUnit}`) : "";
  const submitting = createItem.isPending || stock.committing;

  async function onSubmit(values: ItemValues) {
    try {
      const item = await createItem.mutateAsync({
        ...values,
        // Recording initial stock implies the item is warehouse-managed.
        track_in_warehouse: values.track_in_warehouse || stock.hasStock,
      });
      await stock.commitAdd(item.id, values.base_per_primary);
      toast.success(t("toast.created"));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.error"));
    }
  }

  return (
    <Form {...form}>
      <FormDialog
        title={t("pricing.newItem")}
        onClose={onClose}
        onSubmit={form.handleSubmit(onSubmit)}
        submitting={submitting}
        submitLabel={t("common.create")}
        dirty={stock.dirty}
        widthClassName="w-[calc(100%-2rem)] sm:max-w-2xl"
      >
        <div className="space-y-5">
          <BilingualNameFields control={form.control} enName="name_en" urName="name_ur" />
          <MeasurementFields />
          <ImagesField control={form.control} name="image_urls" label={t("fields.image")} folder="product" />
          <StockInFields
            stock={stock}
            unitLabel={unitLabel}
            title={t("items.initialStock")}
            hint={t("items.initialStockHint")}
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
