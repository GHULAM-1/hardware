"use client";

import { History, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ItemCombobox } from "@/components/common/item-combobox";
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
import { Money } from "@/components/common/money";
import { useItemPricing } from "@/hooks/use-orders";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { formatDate, formatPKR } from "@/lib/format";
import { saleUnitOptions, unitSellingPrice } from "@/lib/units";
import { lineTotal, type LineDraft } from "@/components/orders/order-form-types";

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
  const isSuperAdmin = useIsSuperAdmin();
  const { data: pricing } = useItemPricing(customerId, line.item?.id ?? null);

  const lastPrice = pricing?.lastSoldPrice ?? null;
  // Supplier purchase cost, super-admin only: what it cost when last sold + now.
  const showCostRows = isSuperAdmin && pricing != null && (pricing.lastCostAtSale != null || pricing.currentCost != null);

  // Units this item can be sold in (box vs piece for count packs; primary only otherwise).
  const unitOptions = line.item ? saleUnitOptions(line.item) : [];
  const canChooseUnit = unitOptions.length > 1;

  function pickUnit(unit: string) {
    if (!line.item) return;
    // Switching sale unit re-prefills its price (admin can still override below).
    onChange({ ...line, unit, selling_price: String(unitSellingPrice(line.item, unit)) });
  }

  return (
    <div className="min-w-0 space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">#{index + 1}</span>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-w-0 space-y-1.5">
        <Label>{t("fields.item")}</Label>
        <ItemCombobox
          value={line.item?.id ?? null}
          onSelect={(item) =>
            onChange({
              ...line,
              item,
              unit: item?.primary_unit ?? line.unit,
              selling_price: item ? String(item.selling_price) : line.selling_price,
            })
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
          <Label>{t("fields.unit")}</Label>
          {canChooseUnit ? (
            <Select value={line.unit || undefined} onValueChange={pickUnit}>
              <SelectTrigger className="w-full">
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
            <Input value={line.unit ? t(`units.${line.unit}`) : ""} readOnly dir="auto" tabIndex={-1} />
          )}
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

      {(lastPrice != null || showCostRows) && (
        <div className="space-y-2 rounded-lg border border-brand/30 bg-brand/5 p-3">
          {lastPrice != null && (
            <button
              type="button"
              onClick={() => onChange({ ...line, selling_price: String(lastPrice) })}
              title={t("orders.useLastPrice")}
              className="flex w-full items-center gap-2 text-start text-sm font-semibold text-brand transition-colors hover:underline"
            >
              <History className="h-4 w-4 shrink-0" />
              <span>
                {t("orders.lastSoldToCustomer", { price: formatPKR(lastPrice) })}
                {pricing?.lastSoldAt && (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    {t("orders.lastSoldOn", { date: formatDate(pricing.lastSoldAt) })}
                  </span>
                )}
              </span>
            </button>
          )}
          {showCostRows && (
            <div className="space-y-1 text-sm">
              {pricing?.lastCostAtSale != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("orders.costThen")}</span>
                  <Money value={pricing.lastCostAtSale} />
                </div>
              )}
              {pricing?.currentCost != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("orders.currentCost")}</span>
                  <Money value={pricing.currentCost} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end border-t border-border pt-2 text-sm">
        <span className="me-2 text-muted-foreground">{t("orders.total")}:</span>
        <Money value={lineTotal(line)} className="font-semibold" />
      </div>
    </div>
  );
}
