"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";

import { SupplierCombobox } from "@/components/common/supplier-combobox";
import { DatePicker } from "@/components/common/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StockEntryType } from "@/lib/enums";
import { stockEntrySchema } from "@/lib/schemas";
import { todayISO } from "@/lib/format";
import { toBase } from "@/lib/units";
import { useCreateStockEntry, useSetLatestBuyingPrice } from "@/hooks/use-warehouse";

/**
 * Optional "record a purchase" section shared by the create + edit item dialogs:
 * supplier (with inline "+ add new supplier") + quantity (primary unit) + buying
 * price (per primary unit) + date. `useStockIn` owns the local state and commits a
 * stock-in entry; `StockInFields` renders the inputs. Recording stock implies the
 * item is warehouse-managed (see `hasStock`).
 */
type StockSeed = { supplierId: string | null; buyingPrice: string; qty: string };

const round2 = (n: number) => Math.round(n * 100) / 100;

export function useStockIn(seed?: StockSeed) {
  const [supplierId, setSupplierId] = React.useState<string | null>(seed?.supplierId ?? null);
  const [qty, setQty] = React.useState(seed?.qty ?? "");
  const [buyingPrice, setBuyingPrice] = React.useState(seed?.buyingPrice ?? "");
  const [date, setDate] = React.useState(todayISO());
  const createStock = useCreateStockEntry();
  const setPrice = useSetLatestBuyingPrice();

  // Seed supplier + price + current quantity from the item's stock (edit mode).
  // Seeds once, when the data first arrives, and tracks the baseline so prefilled
  // values don't count as edits (no false discard prompt / no-op commit).
  const [baseline, setBaseline] = React.useState<StockSeed>(
    seed ?? { supplierId: null, buyingPrice: "", qty: "" },
  );
  const seeded = React.useRef(Boolean(seed));
  React.useEffect(() => {
    if (!seed || seeded.current) return;
    seeded.current = true;
    setBaseline(seed);
    setSupplierId(seed.supplierId);
    setBuyingPrice(seed.buyingPrice);
    setQty(seed.qty);
  }, [seed]);

  const dirty =
    supplierId !== baseline.supplierId ||
    buyingPrice !== baseline.buyingPrice ||
    qty !== baseline.qty;
  const hasStock = Number(qty) > 0;

  /** Create-mode: record a purchase that ADDS `qty` to stock. */
  const commitAdd = React.useCallback(
    async (itemId: string, basePerPrimary: number) => {
      if (Number(qty) <= 0) return;
      const entry = stockEntrySchema.parse({
        item_id: itemId,
        type: StockEntryType.In,
        quantity: toBase(Number(qty), basePerPrimary),
        supplier_id: supplierId,
        buying_price: buyingPrice === "" ? null : Number(buyingPrice),
        note: null,
        entry_date: date,
      });
      await createStock.mutateAsync(entry);
    },
    [qty, supplierId, buyingPrice, date, createStock],
  );

  /**
   * Edit-mode: SET stock to the entered quantity, and keep the buying price current.
   *  - Increase → one stock-in for the delta carrying the (new) price + supplier,
   *    which also becomes the latest buying price.
   *  - Decrease → a balancing stock-out (no price).
   *  - Either way, if the price/supplier was edited but the quantity didn't move
   *    (delta ≤ 0), update the latest stock-in's price so "current cost" sticks —
   *    otherwise a price-only edit would be silently dropped.
   */
  const commitSet = React.useCallback(
    async (itemId: string, basePerPrimary: number, currentBase: number) => {
      const priceChanged = buyingPrice !== baseline.buyingPrice;
      const supplierChanged = supplierId !== baseline.supplierId;

      let delta = 0;
      if (qty.trim() !== "") {
        const target = toBase(Number(qty), basePerPrimary);
        delta = round2(target - currentBase);
      }

      if (delta > 0) {
        // New stock-in carries the latest price + supplier.
        await createStock.mutateAsync(
          stockEntrySchema.parse({
            item_id: itemId,
            type: StockEntryType.In,
            quantity: delta,
            supplier_id: supplierId,
            buying_price: buyingPrice === "" ? null : Number(buyingPrice),
            note: null,
            entry_date: date,
          }),
        );
        return;
      }

      if (delta < 0) {
        await createStock.mutateAsync(
          stockEntrySchema.parse({
            item_id: itemId,
            type: StockEntryType.Out,
            quantity: Math.abs(delta),
            supplier_id: null,
            buying_price: null,
            note: null,
            entry_date: date,
          }),
        );
      }

      // Quantity unchanged (or just decreased): persist a price/supplier edit.
      if ((priceChanged || supplierChanged) && buyingPrice !== "") {
        await setPrice.mutateAsync({ itemId, buyingPrice: Number(buyingPrice), supplierId });
      }
    },
    [qty, supplierId, buyingPrice, baseline, date, createStock, setPrice],
  );

  return {
    supplierId,
    setSupplierId,
    qty,
    setQty,
    buyingPrice,
    setBuyingPrice,
    date,
    setDate,
    dirty,
    hasStock,
    committing: createStock.isPending || setPrice.isPending,
    commitAdd,
    commitSet,
  };
}

export type StockInController = ReturnType<typeof useStockIn>;

export function StockInFields({
  stock,
  unitLabel,
  title,
  hint,
}: {
  stock: StockInController;
  unitLabel: string;
  title: string;
  hint: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3 rounded-lg border border-border bg-secondary/40 p-4">
      <div className="space-y-0.5">
        <Label>{title}</Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t("fields.supplier")}</Label>
        <SupplierCombobox value={stock.supplierId} onChange={(v) => stock.setSupplierId(v)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            {t("fields.quantity")}
            {unitLabel ? ` (${unitLabel})` : ""}
          </Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            dir="ltr"
            value={stock.qty}
            onChange={(e) => stock.setQty(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            {t("fields.buyingPrice")}
            {unitLabel ? ` (PKR / ${unitLabel})` : " (PKR)"}
          </Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            dir="ltr"
            value={stock.buyingPrice}
            onChange={(e) => stock.setBuyingPrice(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{t("items.buyingPriceHint")}</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t("fields.date")}</Label>
        <DatePicker value={stock.date} onChange={stock.setDate} />
      </div>
    </div>
  );
}
