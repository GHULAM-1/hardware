"use client";

import { useTranslation } from "react-i18next";
import { ArrowDownUp, ChevronDown, SlidersHorizontal } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  ITEM_SORTS,
  STOCK_FILTERS,
  TRACK_FILTERS,
  activeFilterCount,
  type ItemFilterState,
  type ItemSort,
  type StockFilter,
  type TrackFilter,
} from "@/lib/item-filters";

/** Sort picker — a single-choice menu (radio) matching the app's dropdown styling. */
export function ItemSortMenu({
  value,
  onChange,
}: {
  value: ItemSort;
  onChange: (v: ItemSort) => void;
}) {
  const { t } = useTranslation();
  const current = ITEM_SORTS.find((s) => s.key === value) ?? ITEM_SORTS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="h-9 gap-2">
          <ArrowDownUp className="h-4 w-4 opacity-80" />
          <span className="hidden sm:inline text-white/75">{t("itemsSort.label")}:</span>
          <span className="max-w-[9rem] truncate">{t(current.labelKey)}</span>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t("itemsSort.label")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as ItemSort)}>
          {ITEM_SORTS.map((s) => (
            <DropdownMenuRadioItem key={s.key} value={s.key}>
              {t(s.labelKey)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Filter picker — grouped single-choice sections (Stock, Warehouse). The trigger
 * carries a count badge when any filter is narrowing the list, and a Reset row
 * appears only then.
 */
export function ItemFilterMenu({
  value,
  onChange,
}: {
  value: ItemFilterState;
  onChange: (v: ItemFilterState) => void;
}) {
  const { t } = useTranslation();
  const count = activeFilterCount(value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="h-9 gap-2">
          <SlidersHorizontal className="h-4 w-4 opacity-80" />
          <span>{t("itemsFilter.label")}</span>
          {count > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground tabular-nums">
              {count}
            </span>
          )}
          <ChevronDown className="h-4 w-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t("itemsFilter.stockLabel")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={value.stock}
          onValueChange={(v) => onChange({ ...value, stock: v as StockFilter })}
        >
          {STOCK_FILTERS.map((f) => (
            <DropdownMenuRadioItem key={f.key} value={f.key}>
              {t(f.labelKey)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("itemsFilter.warehouseLabel")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={value.track}
          onValueChange={(v) => onChange({ ...value, track: v as TrackFilter })}
        >
          {TRACK_FILTERS.map((f) => (
            <DropdownMenuRadioItem key={f.key} value={f.key}>
              {t(f.labelKey)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        {count > 0 && (
          <>
            <DropdownMenuSeparator />
            <button
              type="button"
              onClick={() => onChange({ ...value, stock: "all", track: "all" })}
              className="w-full rounded-sm px-2 py-1.5 text-start text-sm font-medium text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              {t("itemsFilter.reset")}
            </button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
