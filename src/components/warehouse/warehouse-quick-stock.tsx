"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { Boxes } from "lucide-react";

import { useItemsWithStock } from "@/hooks/use-warehouse";
import { useDebounce } from "@/hooks/use-debounce";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/i18n-provider";
import { displayName } from "@/lib/display";
import { Combobox, type ComboboxOption } from "@/components/common/combobox";
import { StockEntryForm } from "@/components/warehouse/stock-entry-form";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { ItemWithStock } from "@/types/models";

/**
 * Inline "do it here" stock panel that sits above the warehouse list: pick any
 * tracked item, then stock in / out without opening its dialog. Reuses the exact
 * same StockEntryForm as the dialog, so validation, unit conversion and the
 * in/out toggle behave identically — nothing to keep in sync.
 *
 * Writes to stock_entries are super_admin-only (RLS), matching the dialog, so the
 * panel only renders for a super_admin; others just see the list below.
 */
export function WarehouseQuickStock() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isSuperAdmin = useIsSuperAdmin();

  // The picker owns its own search, independent of the page's list search.
  const [search, setSearch] = React.useState("");
  const debounced = useDebounce(search);
  const { data = [], isLoading } = useItemsWithStock(debounced);

  // Keep the whole item object: it must survive the combobox resetting its search
  // (which refetches a different result set) and the list filtering below.
  const [selected, setSelected] = React.useState<ItemWithStock | null>(null);
  // Bumped after every save so the form remounts to a clean slate for the next
  // entry on the same item (and whenever a new item is picked).
  const [nonce, setNonce] = React.useState(0);

  if (!isSuperAdmin) return null;

  const tracked = data.filter((i) => i.track_in_warehouse);
  const options: ComboboxOption[] = tracked.map((i) => ({
    value: i.id,
    label: displayName(i, language),
  }));

  return (
    <Card className="mb-4 gap-4 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
        >
          <Boxes className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-bold leading-tight text-foreground">
            {t("warehouse.quickStockTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("warehouse.quickStockHint")}</p>
        </div>
      </div>

      <div className="space-y-2 sm:max-w-md">
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
        onDone={() => setNonce((n) => n + 1)}
      />
    </Card>
  );
}
