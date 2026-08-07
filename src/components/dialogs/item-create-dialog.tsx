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
import { ImagesField } from "@/components/forms/fields";
import { ItemNameFields } from "@/components/forms/item-name-fields";
import { MeasurementFields } from "@/components/forms/measurement-fields";
import { PackingFields } from "@/components/forms/packing-fields";
import { StockInFields, useStockIn } from "@/components/forms/stock-in-section";
import { Switch } from "@/components/ui/switch";
import { MeasurementType } from "@/lib/enums";
import { DUPLICATE_ITEM_NAME, itemSchema, type ItemInput, type ItemValues } from "@/lib/schemas";
import { useCreateItem, useItemNameSuggestions } from "@/hooks/use-items";

/**
 * Create a catalog item: name, measurement model (unit → pieces-per-pack),
 * packing styles (Box = 12, Carton = 60 — see @/lib/packings),
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
      buying_price: "",
      low_stock_threshold: "",
      category_id: null,
      image_urls: [],
      track_in_warehouse: false,
      // Start empty — the admin adds a row per pack size (Box = 12, Carton = 60).
      packings: [],
    },
  });

  const primaryUnit = useWatch({ control: form.control, name: "primary_unit" });
  const unitLabel = primaryUnit ? t(`units.${primaryUnit}`) : "";
  const submitting = createItem.isPending || stock.committing;

  // Live duplicate check so submit can be blocked before the round trip. The DB
  // unique index is the real gate; this just gives an instant, in-place message.
  const nameEn = useWatch({ control: form.control, name: "name_en" }) as string;
  const { isDuplicate } = useItemNameSuggestions(nameEn ?? "");

  async function onSubmit(values: ItemValues) {
    if (isDuplicate) {
      form.setError("name_en", { type: "duplicate", message: "items.duplicateName" });
      return;
    }
    try {
      // Warehouse tracking is the toggle's call alone — recording an opening
      // quantity no longer forces it on.
      const item = await createItem.mutateAsync(values);
      // Stamp the purchase with the item's cost so stock history matches it.
      await stock.commitAdd(item.id, values.base_per_primary, values.buying_price);
      toast.success(t("toast.created"));
      onClose();
    } catch (err) {
      // Fallback if the name was taken between the live check and the insert
      // (another tab, a race): pin it on the field instead of a raw sentinel.
      if (err instanceof Error && err.message === DUPLICATE_ITEM_NAME) {
        form.setError("name_en", { type: "duplicate", message: "items.duplicateName" });
        toast.error(t("items.duplicateName"));
        return;
      }
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
          <ItemNameFields />
          <MeasurementFields />
          {/* Pack sizes sit right after the unit — a packing is expressed in
              primary units, so it only makes sense once the unit is picked. */}
          <PackingFields />
          <ImagesField control={form.control} name="image_urls" label={t("fields.image")} folder="product" />
          <StockInFields
            stock={stock}
            unitLabel={unitLabel}
            title={t("items.initialStock")}
            hint={t("items.initialStockHint")}
            // Cost is an item field now (up beside selling price), not a
            // property of this one purchase.
            showBuyingPrice={false}
          />
          <FormField
            control={form.control}
            name="track_in_warehouse"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-4 rounded-lg well border border-white/20 p-3">
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
