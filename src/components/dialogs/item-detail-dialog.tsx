"use client";

import { useTranslation } from "react-i18next";
import { Pencil } from "lucide-react";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { useItemStock, useStockEntries } from "@/hooks/use-warehouse";
import { useItemSuppliers } from "@/hooks/use-suppliers";
import { useLanguage } from "@/providers/i18n-provider";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { StockEntryType } from "@/lib/enums";
import { DialogKey } from "@/lib/dialog-keys";
import { displayName } from "@/lib/display";
import { formatNumber, formatDate } from "@/lib/format";
import { Money } from "@/components/common/money";
import { ImageThumb } from "@/components/common/image-thumb";
import { ZoomableImage } from "@/components/common/zoomable-image";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Item } from "@/types/models";

export type ItemDetailPayload = { item: Item };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-end text-sm font-medium">{children}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

export function ItemDetailDialog({ payload, onClose }: DialogComponentProps<ItemDetailPayload>) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isSuperAdmin = useIsSuperAdmin();
  const { openDialog } = useDialogManager();

  const { item } = payload;
  const { data: stock, isLoading: stockLoading } = useItemStock(item.id);
  const { data: suppliers = [], isLoading: suppliersLoading } = useItemSuppliers(item.id);
  const { data: entries = [], isLoading: entriesLoading } = useStockEntries(item.id);

  const images = item.image_urls?.length ? item.image_urls : item.image_url ? [item.image_url] : [];
  const recent = entries.slice(0, 5);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto overflow-x-hidden sm:max-w-md">
        <DialogHeader className="min-w-0">
          <DialogTitle className="flex min-w-0 items-center gap-3">
            <ImageThumb src={images[0]} alt={item.name_en} />
            <span className="min-w-0 truncate pe-6">{displayName(item, language)}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Image gallery — shadcn carousel */}
          {images.length > 0 && (
            <Carousel className="mx-auto w-[calc(100%-1.5rem)]" opts={{ loop: images.length > 1 }}>
              <CarouselContent>
                {images.map((url) => (
                  <CarouselItem key={url}>
                    <div className="flex h-52 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                      <ZoomableImage src={url} alt={item.name_en} fit="contain" className="h-full w-full" />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {images.length > 1 && (
                <>
                  <CarouselPrevious type="button" />
                  <CarouselNext type="button" />
                </>
              )}
            </Carousel>
          )}

          {/* Key facts */}
          <div className="rounded-lg border border-border bg-card px-4 py-1">
            <Field label={t("warehouse.currentStock")}>
              {stockLoading ? (
                <Skeleton className="h-4 w-16" />
              ) : (
                `${formatNumber(stock ?? 0)} ${t(`units.${item.unit}`)}`
              )}
            </Field>
            <Field label={t("fields.unit")}>{t(`units.${item.unit}`)}</Field>
            <Field label={t("fields.sellingPrice")}>
              <Money value={item.selling_price} />
            </Field>
          </div>

          {/* Suppliers that have sourced this item */}
          {suppliersLoading ? (
            <Section title={t("suppliers.title")}>
              <Skeleton className="h-7 w-40 rounded-full" />
            </Section>
          ) : suppliers.length > 0 ? (
            <Section title={t("suppliers.title")}>
              <div className="flex flex-wrap gap-2">
                {suppliers.map((s) => (
                  <span
                    key={s.id}
                    className="rounded-full border border-border bg-secondary px-3 py-1 text-xs"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </Section>
          ) : null}

          {/* Recent stock activity */}
          {entriesLoading ? (
            <Section title={t("warehouse.history")}>
              <div className="space-y-2">
                <Skeleton className="h-9 w-full rounded-lg" />
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
            </Section>
          ) : recent.length > 0 ? (
            <Section title={t("warehouse.history")}>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {recent.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">{formatDate(e.entry_date)}</span>
                    <span className="flex items-center gap-2">
                      <StatusBadge
                        tone={e.type === StockEntryType.In ? "success" : "danger"}
                        label={t(e.type === StockEntryType.In ? "warehouse.stockIn" : "warehouse.stockOut")}
                      />
                      <span dir="ltr" className="tabular-nums font-medium">
                        {e.type === StockEntryType.In ? "+" : "−"}
                        {Number(e.quantity)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </div>

        {isSuperAdmin && (
          <DialogFooter>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => openDialog(DialogKey.ItemForm, { item })}
            >
              <Pencil className="me-1 h-4 w-4" />
              {t("pricing.editItem")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
