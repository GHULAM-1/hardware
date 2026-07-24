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

/**
 * Inline add/edit form for a single stock movement (in = sourcing, out = manual
 * deduction). `item` may be null so the box can render as an inert placeholder
 * (used by the warehouse quick-stock panel before an item is picked); submitting
 * is blocked until an item is present. When an item IS given (the dialog path),
 * every fallback below is a no-op, so behaviour there is unchanged.
 *
 * `fixedType` locks the form to stock-in OR stock-out and hides the toggle —
 * used by the desktop split panels, where in/out are two distinct boxes rather
 * than one toggled box. Omit it to keep the toggle (dialog + mobile quick-stock).
 */
export function StockEntryForm({
  item,
  editing,
  onDone,
  fixedType,
}: {
  item: ItemWithStock | null;
  editing: StockEntryWithSupplier | null;
  onDone: () => void;
  fixedType?: StockEntryType;
}) {
  const { t } = useTranslation();
  const create = useCreateStockEntry();
  const update = useUpdateStockEntry();
  const unitLabel = (key: string) => t(`units.${key}`);
  // Pack ratio drives unit conversion; default to 1 (no sub-unit) when itemless.
  const basePerPrimary = item?.base_per_primary ?? 1;

  const form = useForm({
    resolver: zodResolver(stockEntrySchema),
    defaultValues: {
      item_id: item?.id ?? "",
      // A locked panel dictates its type; otherwise default to Stock out: the
      // dialog manages an existing item, so sourcing (stock-in) happens at
      // creation and manual deductions are the common action.
      type: (editing?.type as StockEntryType) ?? fixedType ?? StockEntryType.Out,
      // The form works in the item's PRIMARY unit; we convert to base on submit.
      quantity: editing ? fromBase(editing.quantity, basePerPrimary) : ("" as unknown as number),
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
  const showPerBase = basePerPrimary > 1 && Number(price) > 0;
  const perBase = showPerBase ? Number(price) / basePerPrimary : 0;
  // Total of this entry in base units (e.g. "= 50 piece").
  const baseTotal = Number(qty) > 0 ? toBase(Number(qty), basePerPrimary) : 0;

  function setType(next: StockEntryType) {
    form.setValue("type", next);
    if (next === StockEntryType.Out) {
      form.setValue("supplier_id", null);
      form.setValue("buying_price", null);
    }
  }

  async function onSubmit(values: StockEntryValues) {
    // Persist quantity in canonical base units; buying price stays per primary unit.
    if (!item) return; // submit is disabled without an item; guard defensively.
    const payload: StockEntryValues = {
      ...values,
      quantity: toBase(Number(values.quantity), basePerPrimary),
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
        className="space-y-3 rounded-lg well border border-white/20 p-4"
      >
        {/* Type toggle — hidden when the panel is locked to a single type. */}
        {!fixedType && (
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
        )}

        <div className="grid gap-3 sm:grid-cols-2 [&>*]:min-w-0">
          {isIn && item && (
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
            label={`${t("fields.quantity")}${item ? ` (${unitLabel(item.primary_unit)})` : ""}`}
            step="0.01"
          />
          {isIn && item && (
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
        {item && (baseTotal > 0 || showPerBase) && hasSubUnit(item) && (
          <p className="text-xs text-muted-foreground" dir="ltr">
            {baseTotal > 0 && `= ${baseTotal} ${unitLabel(item.base_unit)}`}
            {baseTotal > 0 && showPerBase && " · "}
            {showPerBase && `₨${perBase.toFixed(2)} / ${unitLabel(item.base_unit)}`}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {!item && (
            <p className="me-auto text-xs text-muted-foreground">
              {t("warehouse.pickItemFirst")}
            </p>
          )}
          {editing && (
            <Button type="button" variant="outline" onClick={onDone} disabled={submitting}>
              {t("common.cancel")}
            </Button>
          )}
          <Button type="submit" disabled={submitting || !item}>
            {editing
              ? t("common.save")
              : isIn
                ? t("warehouse.addStock")
                : t("warehouse.removeStock")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
