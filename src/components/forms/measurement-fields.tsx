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
import { Combobox, type ComboboxOption } from "@/components/common/combobox";
import { NumberField } from "@/components/forms/fields";
import { UNIT_CATALOG, deriveUnitModel, isPackableUnit } from "@/lib/units";
import type { ItemInput } from "@/lib/schemas";

/**
 * The item measurement fields, shared by the create + edit dialogs: unit, then
 * (for pack units only) pieces-per-pack, plus buying/selling price and the
 * optional low-stock level.
 *
 * There used to be a "Measured by" Count/Weight/Length switch above the unit
 * dropdown which filtered the unit list. That was redundant — a unit already
 * implies its family — and it hid most units behind a tab. Now there is ONE
 * searchable list covering every unit, and measurement_type / base_unit /
 * base_per_primary are derived from the choice via deriveUnitModel, so the
 * stored values remain a single source of truth.
 */
export function MeasurementFields() {
  const { t } = useTranslation();
  const { control, setValue } = useFormContext<ItemInput>();

  const primaryUnit = useWatch({ control, name: "primary_unit" }) as string;
  const countFactor = useWatch({ control, name: "base_per_primary" });

  const unitLabel = React.useCallback((key: string) => t(`units.${key}`), [t]);
  const primaryLabel = primaryUnit ? unitLabel(primaryUnit) : "";
  // Only ask pieces-per-pack for a real pack unit (box, dozen, …); piece, kg,
  // foot and friends convert by a fixed physical factor.
  const showFactor = !!primaryUnit && isPackableUnit(primaryUnit);

  const unitOptions: ComboboxOption[] = React.useMemo(
    () =>
      UNIT_CATALOG.map((u) => ({
        value: u.key,
        label: unitLabel(u.key),
        group: t(`measurement.${u.group}`),
        // Match the raw key too, so typing "kg" or "sqft" finds the unit even
        // when the visible label is localised (Urdu) or spelled out.
        keywords: u.key,
      })),
    [t, unitLabel],
  );

  // Keep measurement_type / base_unit / base_per_primary in step with the chosen
  // unit. For pack units the factor stays user-entered.
  React.useEffect(() => {
    const model = deriveUnitModel(primaryUnit, Number(countFactor));
    setValue("measurement_type", model.measurement_type, { shouldValidate: true });
    setValue("base_unit", model.base_unit, { shouldValidate: true });
    if (!isPackableUnit(primaryUnit)) {
      setValue("base_per_primary", model.base_per_primary, { shouldValidate: true });
    }
  }, [primaryUnit, countFactor, setValue]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Unit — one searchable list covering every family. */}
        <FormField
          control={control}
          name="primary_unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.primaryUnit")}</FormLabel>
              <FormControl>
                <Combobox
                  options={unitOptions}
                  value={field.value || null}
                  onChange={(v) => field.onChange(v ?? "")}
                  placeholder={t("fields.selectUnit")}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Pieces per pack — pack units only. */}
        {showFactor && (
          <NumberField
            control={control}
            name="base_per_primary"
            label={t("items.piecesPerPrimary", {
              primary: primaryLabel,
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
        {/* Cost sits beside price — the two numbers are read together. It's an
            item column (not derived from stock), so it saves with zero on hand. */}
        <NumberField
          control={control}
          name="buying_price"
          label={primaryLabel ? `${t("fields.buyingPrice")} (PKR / ${primaryLabel})` : `${t("fields.buyingPrice")} (PKR)`}
          hint={t("items.buyingPriceHint")}
          step="0.01"
          optional
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
