"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
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
import { BilingualNameFields, NumberField } from "@/components/forms/fields";
import { UnitSelect } from "@/components/common/unit-select";
import { SupplierCombobox } from "@/components/common/supplier-combobox";
import { DatePicker } from "@/components/common/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { itemSchema, stockEntrySchema, type ItemValues } from "@/lib/schemas";
import { StockEntryType } from "@/lib/enums";
import { todayISO } from "@/lib/format";
import { useCreateItem } from "@/hooks/use-items";
import { useCreateStockEntry } from "@/hooks/use-warehouse";

type SourcingRow = { key: string; supplier_id: string | null; quantity: string; buying_price: string };

let counter = 0;
const newRow = (): SourcingRow => ({ key: `s${counter++}`, supplier_id: null, quantity: "", buying_price: "" });

/**
 * One dialog to create an item: item fields (RHF + zod) AND optional supplier
 * sourcing rows. Creates the item and all stock-in entries at once. Shared by
 * Pricing and Warehouse (one item, two screens).
 */
export function ItemCreateDialog({ onClose }: DialogComponentProps<null>) {
  const { t } = useTranslation();
  const createItem = useCreateItem();
  const createStock = useCreateStockEntry();

  const form = useForm({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name_en: "",
      name_ur: "",
      unit: "pcs",
      selling_price: "" as unknown as number,
      category_id: null,
      image_url: null,
    },
  });

  const [date, setDate] = React.useState(todayISO());
  const [rows, setRows] = React.useState<SourcingRow[]>([newRow()]);
  const submitting = createItem.isPending || createStock.isPending;

  function updateRow(key: string, patch: Partial<SourcingRow>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function onSubmit(values: ItemValues) {
    const filled = rows.filter((r) => r.supplier_id && Number(r.quantity) > 0);
    try {
      const item = await createItem.mutateAsync(values);
      for (const r of filled) {
        const entry = stockEntrySchema.parse({
          item_id: item.id,
          type: StockEntryType.In,
          quantity: r.quantity,
          supplier_id: r.supplier_id,
          buying_price: r.buying_price === "" ? null : r.buying_price,
          note: null,
          entry_date: date,
        });
        await createStock.mutateAsync(entry);
      }
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
        widthClassName="w-[calc(100%-2rem)] sm:max-w-3xl"
      >
        <div className="space-y-5">
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

          {/* Optional sourcing: suppliers + quantities + buying prices, same dialog */}
          <div className="space-y-3 rounded-lg border border-border bg-secondary/40 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Label>{t("orders.sourceFrom")}</Label>
              <DatePicker value={date} onChange={setDate} className="w-full sm:w-44" />
            </div>

            {rows.map((r) => (
              <div
                key={r.key}
                className="relative grid items-end gap-3 rounded-md border border-border/60 bg-background/60 p-3 pe-10 sm:grid-cols-[2fr_1fr_1fr_auto] sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:pe-0"
              >
                <div className="min-w-0 space-y-1.5">
                  <Label className="whitespace-nowrap text-xs text-muted-foreground">{t("fields.supplier")}</Label>
                  <SupplierCombobox value={r.supplier_id} onChange={(v) => updateRow(r.key, { supplier_id: v })} />
                </div>
                <div className="min-w-0 space-y-1.5">
                  <Label className="whitespace-nowrap text-xs text-muted-foreground">{t("fields.quantity")}</Label>
                  <Input
                    type="number"
                    step={1}
                    dir="ltr"
                    value={r.quantity}
                    onChange={(e) => updateRow(r.key, { quantity: e.target.value })}
                  />
                </div>
                <div className="min-w-0 space-y-1.5">
                  <Label className="whitespace-nowrap text-xs text-muted-foreground">{t("fields.buyingPrice")}</Label>
                  <Input
                    type="number"
                    step={1}
                    dir="ltr"
                    value={r.buying_price}
                    onChange={(e) => updateRow(r.key, { buying_price: e.target.value })}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute end-1 top-1 h-8 w-8 sm:static sm:h-10 sm:w-10"
                  onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.key !== r.key) : rs))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" onClick={() => setRows((rs) => [...rs, newRow()])}>
              <Plus className="me-1 h-3.5 w-3.5" />
              {t("fields.supplier")}
            </Button>
          </div>
        </div>
      </FormDialog>
    </Form>
  );
}
