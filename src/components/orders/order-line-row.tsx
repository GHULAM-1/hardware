"use client";

import { History, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ItemCombobox } from "@/components/common/item-combobox";
import { OrderSupplierRow } from "@/components/orders/order-supplier-row";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/common/money";
import { useLastItemPrice } from "@/hooks/use-orders";
import { formatPKR } from "@/lib/format";
import {
  lineTotal,
  newSupplier,
  type LineDraft,
  type LineSupplierDraft,
} from "@/components/orders/order-form-types";

export function OrderLineRow({
  line,
  customerId,
  index,
  onChange,
  onRemove,
}: {
  line: LineDraft;
  customerId: string | null;
  index: number;
  onChange: (next: LineDraft) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const { data: lastPrice } = useLastItemPrice(customerId, line.item?.id ?? null);

  function setSupplier(key: string, next: LineSupplierDraft) {
    onChange({ ...line, suppliers: line.suppliers.map((s) => (s.key === key ? next : s)) });
  }

  return (
    <div className="min-w-0 space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">#{index + 1}</span>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="min-w-0 space-y-1.5">
          <Label>{t("fields.item")}</Label>
          <ItemCombobox
            value={line.item?.id ?? null}
            onSelect={(item) =>
              onChange({
                ...line,
                item,
                unit: item?.unit ?? line.unit,
                selling_price: item ? String(item.selling_price) : line.selling_price,
              })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("fields.quantity")}</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            dir="ltr"
            value={line.quantity}
            onChange={(e) => onChange({ ...line, quantity: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("fields.sellingPrice")}</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            dir="ltr"
            value={line.selling_price}
            onChange={(e) => onChange({ ...line, selling_price: e.target.value })}
          />
        </div>
      </div>

      {lastPrice != null && (
        <button
          type="button"
          onClick={() => onChange({ ...line, selling_price: String(lastPrice) })}
          title={t("orders.useLastPrice")}
          className="inline-flex items-center gap-2 rounded-lg border border-brand/30 bg-brand/10 px-3 py-2 text-start text-sm font-semibold text-brand transition-colors hover:bg-brand/20"
        >
          <History className="h-4 w-4 shrink-0" />
          <span>{t("orders.lastSoldToCustomer", { price: formatPKR(lastPrice) })}</span>
        </button>
      )}

      {/* Supplier sourcing (informational; stock is subtracted manually in the warehouse) */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">{t("orders.sourceFrom")}</Label>
        {line.suppliers.map((s) => (
          <OrderSupplierRow
            key={s.key}
            itemId={line.item?.id ?? null}
            value={s}
            onChange={(next) => setSupplier(s.key, next)}
            onRemove={() =>
              onChange({ ...line, suppliers: line.suppliers.filter((x) => x.key !== s.key) })
            }
          />
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange({ ...line, suppliers: [...line.suppliers, newSupplier()] })}
        >
          <Plus className="me-1 h-3.5 w-3.5" />
          {t("fields.supplier")}
        </Button>
      </div>

      <div className="flex justify-end border-t border-border pt-2 text-sm">
        <span className="me-2 text-muted-foreground">{t("orders.total")}:</span>
        <Money value={lineTotal(line)} className="font-semibold" />
      </div>
    </div>
  );
}
