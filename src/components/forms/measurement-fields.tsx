"use client";

import * as React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NumberField } from "@/components/forms/fields";
import { MeasurementType } from "@/lib/enums";
import { PRIMARY_UNITS, deriveUnitModel, isCountBaseUnit } from "@/lib/units";
import type { ItemInput } from "@/lib/schemas";
import { cn } from "@/lib/utils";

/** Sensible default primary unit when the admin switches measurement type. */
const DEFAULT_PRIMARY: Record<MeasurementType, string> = {
  [MeasurementType.Count]: "piece",
  [MeasurementType.Weight]: "kg",
  [MeasurementType.Length]: "foot",
};

const TYPE_OPTIONS = [MeasurementType.Count, MeasurementType.Weight, MeasurementType.Length] as const;

/**
 * The item measurement model fields, shared by the create + edit dialogs:
 * measurement type → primary unit → (count only) pieces-per-pack, plus selling
 * price (per primary unit) and an optional low-stock level. Keeps the derived
 * base_unit / base_per_primary / unit in form state via deriveUnitModel so the
 * stored values stay a single source of truth.
 */
export function MeasurementFields() {
  const { t } = useTranslation();
  const { control, setValue } = useFormContext<ItemInput>();

  const measurementType = useWatch({ control, name: "measurement_type" }) as MeasurementType;
  const primaryUnit = useWatch({ control, name: "primary_unit" }) as string;
  const countFactor = useWatch({ control, name: "base_per_primary" });

  const isCount = measurementType === MeasurementType.Count;
  // Only ask pieces-per-pack once a real bulk unit is chosen (avoids a broken
  // "...in one units.?" label when no unit is selected yet).
  const showFactor = isCount && !!primaryUnit && !isCountBaseUnit(primaryUnit);
  const unitLabel = (key: string) => t(`units.${key}`);
  const primaryLabel = primaryUnit ? unitLabel(primaryUnit) : "";

  // Keep base_unit / unit (and base_per_primary for non-count) in sync with the
  // chosen type + primary unit. For count packs the factor is user-entered.
  React.useEffect(() => {
    const model = deriveUnitModel(measurementType, primaryUnit, Number(countFactor));
    setValue("base_unit", model.base_unit, { shouldValidate: true });
    if (measurementType !== MeasurementType.Count || isCountBaseUnit(primaryUnit)) {
      setValue("base_per_primary", model.base_per_primary, { shouldValidate: true });
    }
  }, [measurementType, primaryUnit, countFactor, setValue]);

  function pickType(next: MeasurementType) {
    if (next === measurementType) return;
    setValue("measurement_type", next, { shouldValidate: true });
    setValue("primary_unit", DEFAULT_PRIMARY[next], { shouldValidate: true });
  }

  return (
    <div className="space-y-4">
      {/* Measurement type */}
      <FormItem>
        <FormLabel>{t("fields.measurementType")}</FormLabel>
        <div className="inline-flex w-full rounded-md border border-border p-0.5">
          {TYPE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => pickType(option)}
              className={cn(
                "flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors",
                measurementType === option
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground",
              )}
            >
              {t(`measurement.${option}`)}
            </button>
          ))}
        </div>
      </FormItem>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Primary unit */}
        <FormField
          control={control}
          name="primary_unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.primaryUnit")}</FormLabel>
              <FormControl>
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("fields.selectUnit")} />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIMARY_UNITS[measurementType].map((u) => (
                      <SelectItem key={u} value={u}>
                        {unitLabel(u)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Pieces per pack (count bulk units only) */}
        {showFactor && (
          <NumberField
            control={control}
            name="base_per_primary"
            label={t("items.piecesPerPrimary", {
              primary: unitLabel(primaryUnit),
              base: unitLabel("piece"),
            })}
            min={1}
            integer
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          control={control}
          name="selling_price"
          label={primaryLabel ? `${t("fields.sellingPrice")} (PKR / ${primaryLabel})` : `${t("fields.sellingPrice")} (PKR)`}
          hint={t("items.sellingPriceHint")}
          step="0.01"
        />
        <NumberField
          control={control}
          name="low_stock_threshold"
          label={primaryLabel ? t("items.lowStockAlert", { unit: primaryLabel }) : t("items.lowStockAlertNoUnit")}
          hint={t("items.lowStockHint")}
          step="0.01"
          optional
        />
      </div>
    </div>
  );
}
