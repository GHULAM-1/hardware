"use client";

import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ItemCombobox } from "@/components/common/item-combobox";
import { VoiceInputButton } from "@/components/common/voice-input-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { SupplierOrderLineDraft } from "@/components/supplier-orders/supplier-order-form-types";

/** One supplier-order line: item + quantity (+ unit) + optional note. No prices. */
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
            value={line.item?.id ?? null}
            onSelect={(item) =>
              onChange({ ...line, item, unit: item?.primary_unit ?? line.unit })
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
            {line.unit && (
              <span className="whitespace-nowrap text-sm text-muted-foreground">
                {t(`units.${line.unit}`)}
              </span>
            )}
          </div>
        </div>
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
