"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { StockEntryType } from "@/lib/enums";
import { stockEntrySchema, type StockEntryValues } from "@/lib/schemas";
import { todayISO } from "@/lib/format";
import { useCreateStockEntry, useUpdateStockEntry } from "@/hooks/use-warehouse";
import { SupplierCombobox } from "@/components/common/supplier-combobox";
import { DatePicker } from "@/components/common/date-picker";
import { NumberField, TextField } from "@/components/forms/fields";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { StockEntryWithSupplier } from "@/types/models";

/** Inline add/edit form for a single stock movement (in = sourcing, out = manual deduction). */
export function StockEntryForm({
  itemId,
  editing,
  onDone,
}: {
  itemId: string;
  editing: StockEntryWithSupplier | null;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const create = useCreateStockEntry();
  const update = useUpdateStockEntry();

  const form = useForm({
    resolver: zodResolver(stockEntrySchema),
    defaultValues: {
      item_id: itemId,
      // Default to Stock out: this dialog manages an existing item; sourcing
      // (stock-in) happens at creation, manual deductions are the common action.
      type: (editing?.type as StockEntryType) ?? StockEntryType.Out,
      quantity: editing ? editing.quantity : ("" as unknown as number),
      supplier_id: editing?.supplier_id ?? null,
      buying_price: editing?.buying_price ?? null,
      note: editing?.note ?? "",
      entry_date: editing?.entry_date ?? todayISO(),
    },
  });

  const type = useWatch({ control: form.control, name: "type" });
  const isIn = type === StockEntryType.In;
  const submitting = create.isPending || update.isPending;

  function setType(next: StockEntryType) {
    form.setValue("type", next);
    if (next === StockEntryType.Out) {
      form.setValue("supplier_id", null);
      form.setValue("buying_price", null);
    }
  }

  async function onSubmit(values: StockEntryValues) {
    try {
      if (editing) await update.mutateAsync({ id: editing.id, values });
      else await create.mutateAsync(values);
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

        <div className="grid gap-3 sm:grid-cols-2">
          {isIn && (
            <FormField
              control={form.control}
              name="supplier_id"
              render={({ field }) => (
                <FormItem>
                  <Label>{t("fields.supplier")}</Label>
                  <FormControl>
                    <SupplierCombobox value={field.value ?? null} onChange={(v) => field.onChange(v)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <NumberField control={form.control} name="quantity" label={t("fields.quantity")} />
          {isIn && (
            <NumberField control={form.control} name="buying_price" label={`${t("fields.buyingPrice")} (PKR)`} />
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
              label={isIn ? t("fields.note") : `${t("fields.reason")} *`}
              optional={isIn}
            />
          </div>
        </div>

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
