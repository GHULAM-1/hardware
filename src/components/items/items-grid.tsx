"use client";

import { Loader2, MoreVertical, Package, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useLanguage } from "@/providers/i18n-provider";
import { displayName } from "@/lib/display";
import { formatQuantity } from "@/lib/units";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Money } from "@/components/common/money";
import { ZoomableImage } from "@/components/common/zoomable-image";
import type { ItemWithStock } from "@/types/models";

type ItemsGridProps = {
  items: ItemWithStock[];
  loading?: boolean;
  selectedId?: string;
  onOpen: (row: ItemWithStock) => void;
  isSuperAdmin: boolean;
  /** Warehouse-tracking toggle state + handler (super-admin only). */
  trackingPendingId?: string;
  onToggleTracking: (id: string, track: boolean) => void;
  onEdit: (row: ItemWithStock) => void;
  onDelete: (row: ItemWithStock) => void;
};

// Mobile-first column ramp: 2 up on phones, more as width allows. The xl step
// eases off because the detail aside claims 360px at that breakpoint.
const GRID_COLS =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4";

export function ItemsGrid({
  items,
  loading,
  selectedId,
  onOpen,
  isSuperAdmin,
  trackingPendingId,
  onToggleTracking,
  onEdit,
  onDelete,
}: ItemsGridProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  if (loading) {
    return (
      <div className={GRID_COLS}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="h-56 animate-pulse gap-0 rounded-2xl bg-muted/50 p-0" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">{t("common.noResults")}</Card>
    );
  }

  return (
    <div className={GRID_COLS}>
      {items.map((item) => {
        const src = item.image_urls?.[0] ?? item.image_url;
        const selected = selectedId === item.id;
        const outOfStock = item.quantity <= 0;
        return (
          <Card
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(item)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen(item);
              }
            }}
            className={cn(
              "group relative cursor-pointer gap-0 overflow-hidden rounded-2xl p-0 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected ? "ring-2 ring-gold" : "ring-1 ring-black/5",
            )}
          >
            {/* Warehouse toggle — top strip, super-admin only. Green when on so the
                on/off state reads at a glance (theme primary is gold). */}
            {isSuperAdmin && (
              <div
                className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="min-w-0 truncate text-[11px] font-semibold text-muted-foreground">
                  {t("items.addInWarehouse")}
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  {trackingPendingId === item.id && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  )}
                  <Switch
                    size="sm"
                    checked={item.track_in_warehouse}
                    disabled={trackingPendingId === item.id}
                    onCheckedChange={(track) => onToggleTracking(item.id, track)}
                    className="data-[state=checked]:bg-green-500"
                    aria-label={t("items.addInWarehouse")}
                  />
                </div>
              </div>
            )}

            {/* Image — compact 4:3 band with a soft placeholder when empty. */}
            <div className="relative aspect-[4/3] bg-gradient-to-br from-muted/60 to-muted/25">
              {src ? (
                <ZoomableImage
                  src={src}
                  alt={item.name_en}
                  fit="contain"
                  className="absolute inset-0 h-full w-full p-2"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-background/70 text-muted-foreground shadow-sm">
                    <Package className="h-5 w-5" />
                  </div>
                </div>
              )}

              {/* Out-of-stock flag (only when relevant, keeps the image clean). */}
              {outOfStock && (
                <span className="absolute start-1.5 top-1.5 rounded-full bg-destructive/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm">
                  {t("warehouse.outOfStock")}
                </span>
              )}

              {/* Actions — subtle kebab, only for super-admin. */}
              {isSuperAdmin && (
                <div className="absolute end-1.5 top-1.5" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={t("common.actions")}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-background/85 text-foreground/80 shadow-sm backdrop-blur-sm transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => onEdit(item)}>
                        <Pencil className="h-4 w-4" />
                        {t("common.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onDelete(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                        {t("common.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col gap-2.5 p-3">
              <div className="min-w-0">
                <p className="line-clamp-1 text-sm font-bold leading-tight text-white">
                  {displayName(item, language)}
                </p>
                <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
                  {item.sku}
                </p>
              </div>

              <div className="mt-auto flex items-end justify-between gap-2 border-t border-border/60 pt-2.5">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {t("warehouse.currentStock")}
                  </p>
                  <p
                    dir="ltr"
                    className={cn(
                      "truncate text-sm font-bold tabular-nums",
                      outOfStock ? "text-game-red-l" : "text-white",
                    )}
                  >
                    {formatQuantity(item, item.quantity, (k) => t(`units.${k}`))}
                  </p>
                </div>
                <div className="shrink-0 text-end">
                  {/* Buying price above selling — muted so selling stays the hero figure. */}
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {t("fields.buyingPrice")}
                  </p>
                  {item.buying_price != null ? (
                    <Money value={item.buying_price} className="text-xs font-semibold text-muted-foreground" />
                  ) : (
                    <span className="text-xs font-semibold text-muted-foreground">—</span>
                  )}
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {t("fields.sellingPrice")}
                  </p>
                  <Money value={item.selling_price} className="text-base font-extrabold text-primary" />
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
