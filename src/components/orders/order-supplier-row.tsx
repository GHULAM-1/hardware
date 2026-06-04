"use client";

import * as React from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Combobox, type ComboboxOption } from "@/components/common/combobox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSupplierBuyingPrice } from "@/hooks/use-orders";
import { useItemSuppliers } from "@/hooks/use-suppliers";
import type { LineSupplierDraft } from "@/components/orders/order-form-types";

/** One supplier allocation within an order line (which supplier the stock is drawn from). */
export function OrderSupplierRow({
  itemId,
  value,
  onChange,
  onRemove,
}: {
  itemId: string | null;
  value: LineSupplierDraft;
  onChange: (next: LineSupplierDraft) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const { data: buyingPrice } = useSupplierBuyingPrice(itemId, value.supplier_id);
  // Only suppliers that have actually supplied this item (linked via stock entries).
  const { data: itemSuppliers = [], isLoading } = useItemSuppliers(itemId);
  const options: ComboboxOption[] = itemSuppliers.map((s) => ({ value: s.id, label: s.name }));

  // Auto-fill the read-only buying price snapshot from the query when the supplier
  // is chosen (syncing an external system → state, a valid effect use).
  React.useEffect(() => {
    if (buyingPrice != null && !value.buying_price) {
      onChange({ ...value, buying_price: String(buyingPrice) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyingPrice]);

  return (
    <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
      <div className="min-w-0 max-sm:col-span-3">
        <Combobox
          options={options}
          loading={isLoading}
          disabled={!itemId}
          value={value.supplier_id}
          onChange={(v) => onChange({ ...value, supplier_id: v, buying_price: "" })}
          placeholder={itemId ? t("fields.supplier") : t("fields.item")}
        />
      </div>
      <Input
        type="number"
        min={0}
        step="0.01"
        placeholder={t("fields.quantity")}
        className="w-full min-w-0"
        dir="ltr"
        value={value.quantity}
        onChange={(e) => onChange({ ...value, quantity: e.target.value })}
      />
      <Input
        type="number"
        readOnly
        placeholder={t("fields.buyingPrice")}
        className="w-full min-w-0 bg-muted"
        dir="ltr"
        value={value.buying_price}
        title={t("fields.buyingPrice")}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 w-10 shrink-0 justify-self-end"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
