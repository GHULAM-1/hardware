"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { StockEntryType } from "@/lib/enums";
import { stockEntrySchema, type StockEntryValues } from "@/lib/schemas";
import { todayISO } from "@/lib/format";
import { fromBase, hasSubUnit, toBase } from "@/lib/units";
import { useCreateStockEntry, useUpdateStockEntry } from "@/hooks/use-warehouse";
import { SupplierCombobox } from "@/components/common/supplier-combobox";
import { DatePicker } from "@/components/common/date-picker";
import { NumberField, TextField } from "@/components/forms/fields";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ItemWithStock, StockEntryWithSupplier } from "@/types/models";

/** Inline add/edit form for a single stock movement (in = sourcing, out = manual deduction). */
export function StockEntryForm({
  item,
  editing,
  onDone,
}: {
  item: ItemWithStock;
  editing: StockEntryWithSupplier | null;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const create = useCreateStockEntry();
  const update = useUpdateStockEntry();
  const unitLabel = (key: string) => t(`units.${key}`);

  const form = useForm({
    resolver: zodResolver(stockEntrySchema),
    defaultValues: {
      item_id: item.id,
      // Default to Stock out: this dialog manages an existing item; sourcing
      // (stock-in) happens at creation, manual deductions are the common action.
      type: (editing?.type as StockEntryType) ?? StockEntryType.Out,
      // The form works in the item's PRIMARY unit; we convert to base on submit.
      quantity: editing ? fromBase(editing.quantity, item.base_per_primary) : ("" as unknown as number),
      supplier_id: editing?.supplier_id ?? null,
      buying_price: editing?.buying_price ?? null,
      note: editing?.note ?? "",
      entry_date: editing?.entry_date ?? todayISO(),
    },
  });

  const type = useWatch({ control: form.control, name: "type" });
  const qty = useWatch({ control: form.control, name: "quantity" });
  const price = useWatch({ control: form.control, name: "buying_price" });
  const isIn = type === StockEntryType.In;
  const submitting = create.isPending || update.isPending;

  // Per-base cost hint (e.g. "₨10 / piece") so the admin sees the derived unit cost.
  const showPerBase = item.base_per_primary > 1 && Number(price) > 0;
  const perBase = showPerBase ? Number(price) / item.base_per_primary : 0;
  // Total of this entry in base units (e.g. "= 50 piece").
  const baseTotal = Number(qty) > 0 ? toBase(Number(qty), item.base_per_primary) : 0;

  function setType(next: StockEntryType) {
    form.setValue("type", next);
    if (next === StockEntryType.Out) {
      form.setValue("supplier_id", null);
      form.setValue("buying_price", null);
    }
  }

  async function onSubmit(values: StockEntryValues) {
    // Persist quantity in canonical base units; buying price stays per primary unit.
    const payload: StockEntryValues = {
      ...values,
      quantity: toBase(Number(values.quantity), item.base_per_primary),
    };
    try {
      if (editing) await update.mutateAsync({ id: editing.id, values: payload });
      else await create.mutateAsync(payload);
      toast.success(t("toast.saved"));
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.error"));
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="space-y-3 rounded-lg border border-border bg-secondary/40 p-4"
      >
        {/* Type toggle */}
        <div className="inline-flex rounded-md border border-border p-0.5">
          {[StockEntryType.In, StockEntryType.Out].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setType(option)}
              className={cn(
                "rounded px-3 py-1 text-sm font-medium transition-colors",
                type === option ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {option === StockEntryType.In ? t("warehouse.stockIn") : t("warehouse.stockOut")}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 [&>*]:min-w-0">
          {isIn && (
            <FormField
              control={form.control}
              name="supplier_id"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <Label>{t("fields.supplier")}</Label>
                  <FormControl>
                    <SupplierCombobox
                      value={field.value ?? null}
                      onChange={(v) => field.onChange(v)}
                      itemId={item.id}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <NumberField
            control={form.control}
            name="quantity"
            label={`${t("fields.quantity")} (${unitLabel(item.primary_unit)})`}
            step="0.01"
          />
          {isIn && (
            <NumberField
              control={form.control}
              name="buying_price"
              label={`${t("fields.buyingPrice")} (PKR / ${unitLabel(item.primary_unit)})`}
              step="0.01"
            />
          )}
          <FormField
            control={form.control}
            name="entry_date"
            render={({ field }) => (
              <FormItem>
                <Label>{t("fields.date")}</Label>
                <FormControl>
                  <DatePicker value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="sm:col-span-2">
            <TextField
              control={form.control}
              name="note"
              label={isIn ? t("fields.note") : t("fields.reason")}
              optional
            />
          </div>
        </div>

        {/* Derived hints: total in base units + per-base cost for packs. */}
        {(baseTotal > 0 || showPerBase) && hasSubUnit(item) && (
          <p className="text-xs text-muted-foreground" dir="ltr">
            {baseTotal > 0 && `= ${baseTotal} ${unitLabel(item.base_unit)}`}
            {baseTotal > 0 && showPerBase && " · "}
            {showPerBase && `₨${perBase.toFixed(2)} / ${unitLabel(item.base_unit)}`}
          </p>
        )}

        <div className="flex justify-end gap-2">
          {editing && (
            <Button type="button" variant="outline" onClick={onDone} disabled={submitting}>
              {t("common.cancel")}
            </Button>
          )}
          <Button type="submit" disabled={submitting}>
            {editing ? t("common.save") : t("warehouse.addStock")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
