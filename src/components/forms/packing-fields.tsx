"use client";

import * as React from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PACKINGS_MAX, PACKING_LABEL_MAX } from "@/lib/packings";
import type { ItemInput } from "@/lib/schemas";

/**
 * Packing styles for an item — a repeatable "pack name + how many units it
 * holds" list ("Box" 12, "Carton" 60, "Crate" 200).
 *
 * The name is free text on purpose: every trade names its packs differently, and
 * these rows are descriptive only (the item detail prices a pack from them). The
 * quantity is in the item's PRIMARY unit, so the label shows that unit live as
 * soon as one is chosen — otherwise "12" is ambiguous.
 */
export function PackingFields() {
  const { t } = useTranslation();
  const { control, formState } = useFormContext<ItemInput>();
  const { fields, append, remove } = useFieldArray({ control, name: "packings" });

  const primaryUnit = useWatch({ control, name: "primary_unit" }) as string;
  const unitLabel = primaryUnit ? t(`units.${primaryUnit}`) : t("fields.unit").toLowerCase();

  // Duplicate labels are rejected at the array level, so the message has no row
  // of its own to render under — surface it above the list. RHF files errors
  // aimed at a field-array's own path under `.root`; fall back to the plain
  // message so the error can never be swallowed silently.
  const packingErrors = formState.errors.packings;
  const arrayError = packingErrors?.root?.message ?? packingErrors?.message;
  const atMax = fields.length >= PACKINGS_MAX;

  return (
    <div className="space-y-3 rounded-lg well border border-white/20 p-3">
      <div className="min-w-0 space-y-0.5">
        <FormLabel>{t("items.packings")}</FormLabel>
        <p className="text-xs text-muted-foreground">{t("items.packingsHint")}</p>
      </div>

      {typeof arrayError === "string" && (
        <p className="text-sm font-medium text-destructive">{t(arrayError)}</p>
      )}

      {fields.length > 0 && (
        <div className="space-y-2">
          {fields.map((row, index) => (
            <div key={row.id} className="flex items-start gap-2">
              {/* Row number — packs are usually recited in order (1 box, 2 carton,
                  3 crate), so numbering them makes the list easy to talk about and
                  to match against a supplier's own sheet. Purely positional, so
                  it's aria-hidden; the inputs carry the number in their labels. */}
              <span
                aria-hidden
                className="mt-1.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-xs font-extrabold tabular-nums"
              >
                {index + 1}
              </span>
              <FormField
                control={control}
                name={`packings.${index}.label`}
                render={({ field }) => (
                  <FormItem className="min-w-0 flex-[3]">
                    <FormControl>
                      <Input
                        {...field}
                        value={(field.value as string | null) ?? ""}
                        maxLength={PACKING_LABEL_MAX}
                        placeholder={t("items.packingLabelPlaceholder")}
                        aria-label={`${index + 1}. ${t("items.packingLabel")}`}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`packings.${index}.qty`}
                render={({ field }) => (
                  <FormItem className="min-w-0 flex-[2]">
                    <FormControl>
                      <Input
                        {...field}
                        value={(field.value as string | number | null) ?? ""}
                        type="number"
                        min={0}
                        step="any"
                        dir="ltr"
                        placeholder={t("items.packingQtyPlaceholder", { unit: unitLabel })}
                        aria-label={`${index + 1}. ${t("items.packingQty", { unit: unitLabel })}`}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                aria-label={`${index + 1}. ${t("common.remove")}`}
                title={t("common.remove")}
                className="mt-0.5 shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={atMax}
        onClick={() => append({ label: "", qty: "" as unknown as number })}
      >
        <Plus className="-ms-1 me-1 h-4 w-4" />
        {t("items.addPacking")}
      </Button>
    </div>
  );
}
