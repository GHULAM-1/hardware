"use client";

import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ItemCombobox } from "@/components/common/item-combobox";
import { SupplierCombobox } from "@/components/common/supplier-combobox";
import { VoiceInputButton } from "@/components/common/voice-input-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saleUnitOptions } from "@/lib/units";
import type { SupplierOrderLineDraft } from "@/components/supplier-orders/supplier-order-form-types";

/** One supplier-order line: item + its supplier + quantity (+ unit) + optional note. No prices. */
export function SupplierOrderLineRow({
  line,
  index,
  onChange,
  onRemove,
}: {
  line: SupplierOrderLineDraft;
  index: number;
  onChange: (next: SupplierOrderLineDraft) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();

  // Compatible units for the chosen item (kg/ton, inch/foot/meter, box/piece…).
  // Prices are irrelevant for purchasing, so feed a 0 selling price.
  const unitOptions = line.item ? saleUnitOptions({ ...line.item, selling_price: 0 }) : [];
  const canChooseUnit = unitOptions.length > 1;

  return (
    <div className="min-w-0 space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">#{index + 1}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-3 [&>*]:min-w-0 sm:grid-cols-[2fr_1fr]">
        <div className="space-y-1.5">
          <Label>{t("fields.item")}</Label>
          <ItemCombobox
            value={line.itemId}
            onSelect={(item) =>
              onChange({
                ...line,
                itemId: item?.id ?? null,
                item: item ?? null,
                unit: item?.primary_unit ?? line.unit,
              })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("fields.quantity")}</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              dir="ltr"
              value={line.quantity}
              // Whole units only — you order whole bags/boxes, not fractions.
              onChange={(e) => onChange({ ...line, quantity: e.target.value.replace(/\D/g, "") })}
            />
            {canChooseUnit ? (
              <Select value={line.unit || undefined} onValueChange={(u) => onChange({ ...line, unit: u })}>
                <SelectTrigger className="w-28 shrink-0">
                  <SelectValue placeholder={t("fields.selectUnit")} />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map((o) => (
                    <SelectItem key={o.unit} value={o.unit}>
                      {t(`units.${o.unit}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              line.unit && (
                <span className="whitespace-nowrap text-sm text-muted-foreground">
                  {t(`units.${line.unit}`)}
                </span>
              )
            )}
          </div>
        </div>
      </div>

      {/* Each line has its OWN supplier — one item ↔ one supplier. */}
      <div className="space-y-1.5">
        <Label>
          {t("fields.supplier")}
          <span className="ms-1 text-muted-foreground">({t("common.optional")})</span>
        </Label>
        <SupplierCombobox
          value={line.supplierId}
          onChange={(v) => onChange({ ...line, supplierId: v })}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label>
            {t("fields.note")}
            <span className="ms-1 text-muted-foreground">({t("common.optional")})</span>
          </Label>
          <VoiceInputButton
            onText={(text) =>
              onChange({ ...line, note: line.note ? `${line.note} ${text}` : text })
            }
          />
        </div>
        <Input
          value={line.note}
          placeholder={t("supplierOrders.notePlaceholder")}
          onChange={(e) => onChange({ ...line, note: e.target.value })}
        />
      </div>
    </div>
  );
}
