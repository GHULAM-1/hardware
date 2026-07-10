"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { Boxes, PackagePlus, PackageMinus } from "lucide-react";

import { StockEntryType } from "@/lib/enums";
import { useItemsWithStock } from "@/hooks/use-warehouse";
import { useDebounce } from "@/hooks/use-debounce";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/i18n-provider";
import { displayName } from "@/lib/display";
import { cn } from "@/lib/utils";
import { Combobox, type ComboboxOption } from "@/components/common/combobox";
import { StockEntryForm } from "@/components/warehouse/stock-entry-form";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { ItemWithStock } from "@/types/models";

type PanelTone = "neutral" | "in" | "out";

const TONE: Record<PanelTone, { badge: string; icon: React.ElementType }> = {
  neutral: { badge: "bg-primary/10 text-primary", icon: Boxes },
  in: { badge: "bg-emerald-500/10 text-emerald-600", icon: PackagePlus },
  out: { badge: "bg-rose-500/10 text-rose-600", icon: PackageMinus },
};

/**
 * One "do it here" stock box: pick any tracked item, then record a movement.
 * `fixedType` locks it to stock-in or stock-out (the desktop split shows two of
 * these side by side); omit it for the combined toggle box used on mobile. Owns
 * its own picker search + selection so multiple panels stay independent.
 */
function QuickStockPanel({
  title,
  hint,
  tone,
  fixedType,
  className,
}: {
  title: string;
  hint: string;
  tone: PanelTone;
  fixedType?: StockEntryType;
  className?: string;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  // The picker owns its own search, independent of the page's list search.
  const [search, setSearch] = React.useState("");
  const debounced = useDebounce(search);
  // Identical search terms share one request across panels (React Query dedupe).
  const { data = [], isLoading } = useItemsWithStock(debounced);

  // Keep the whole item object: it must survive the combobox resetting its search
  // (which refetches a different result set) and the list filtering below.
  const [selected, setSelected] = React.useState<ItemWithStock | null>(null);
  // Bumped after every save so the form remounts to a clean slate for the next
  // entry on the same item (and whenever a new item is picked).
  const [nonce, setNonce] = React.useState(0);

  const tracked = data.filter((i) => i.track_in_warehouse);
  const options: ComboboxOption[] = tracked.map((i) => ({
    value: i.id,
    label: displayName(i, language),
  }));

  const { badge, icon: Icon } = TONE[tone];

  return (
    <Card className={cn("gap-4 p-4 sm:p-5", className)}>
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl",
            badge,
          )}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-bold leading-tight text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("fields.item")}</Label>
        <Combobox
          options={options}
          value={selected?.id ?? null}
          onChange={(v) => {
            setSelected(tracked.find((i) => i.id === v) ?? null);
            setNonce((n) => n + 1);
          }}
          onSearchChange={setSearch}
          loading={isLoading}
          placeholder={t("warehouse.quickStockPick")}
        />
      </div>

      {/* Always rendered so the box is visible even before an item is picked;
          the form stays inert (submit disabled) until `selected` is set. */}
      <StockEntryForm
        key={`${selected?.id ?? "none"}-${nonce}`}
        item={selected}
        editing={null}
        fixedType={fixedType}
        onDone={() => setNonce((n) => n + 1)}
      />
    </Card>
  );
}

/**
 * Inline stock panel above the warehouse list. On phones/tablets it's a single
 * card with an in/out toggle; on laptops+ (lg) it splits into two distinct boxes
 * — Stock in and Stock out — side by side, so each action is a clear standalone
 * option rather than a hidden toggle state.
 *
 * Writes to stock_entries are super_admin-only (RLS), matching the dialog, so the
 * panel only renders for a super_admin; others just see the list below.
 */
export function WarehouseQuickStock() {
  const { t } = useTranslation();
  const isSuperAdmin = useIsSuperAdmin();

  if (!isSuperAdmin) return null;

  return (
    <>
      {/* Phones / tablets: one combined card with the in/out toggle. */}
      <div className="mb-4 lg:hidden">
        <QuickStockPanel
          title={t("warehouse.quickStockTitle")}
          hint={t("warehouse.quickStockHint")}
          tone="neutral"
        />
      </div>

      {/* Laptops & desktops: two distinct, always-visible options. */}
      <div className="mb-4 hidden gap-4 lg:grid lg:grid-cols-2">
        <QuickStockPanel
          title={t("warehouse.stockIn")}
          hint={t("warehouse.quickStockInHint")}
          tone="in"
          fixedType={StockEntryType.In}
        />
        <QuickStockPanel
          title={t("warehouse.stockOut")}
          hint={t("warehouse.quickStockOutHint")}
          tone="out"
          fixedType={StockEntryType.Out}
        />
      </div>
    </>
  );
}
