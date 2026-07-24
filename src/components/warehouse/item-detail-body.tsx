"use client";

import * as React from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { useItemStock, useStockEntries } from "@/hooks/use-warehouse";
import { useItemSuppliers } from "@/hooks/use-suppliers";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/i18n-provider";
import { StockEntryType } from "@/lib/enums";
import { DialogKey } from "@/lib/dialog-keys";
import { displayName } from "@/lib/display";
import { formatDate, formatDateTime, formatPKR } from "@/lib/format";
import { formatQuantity, hasSubUnit } from "@/lib/units";
import { itemPackings, packTotal, type Packing } from "@/lib/packings";
import { Money } from "@/components/common/money";
import { ZoomableImage } from "@/components/common/zoomable-image";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Icon3D } from "@/components/ui/icon-3d";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { Item } from "@/types/models";

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

/**
 * Pack pricing — pick one of the item's packing styles ("Box", "Carton", …) and
 * see what that whole pack holds and what it comes to.
 *
 * The maths is deliberately plain: prices on an item are per PRIMARY unit, so a
 * pack is just `qty x price`. Nothing here reads stock, and nothing here writes
 * — it answers "what do I charge for a full box?" without the admin reaching
 * for a calculator.
 */
function PackingPicker({ item, packings }: { item: Item; packings: Packing[] }) {
  const { t } = useTranslation();
  // Default to the first pack so the panel is useful the moment it renders —
  // an empty select would make the admin click before seeing any number.
  const [index, setIndex] = React.useState(0);
  const pack = packings[Math.min(index, packings.length - 1)];
  const unit = t(`units.${item.primary_unit}`);
  const sellTotal = packTotal(item.selling_price, pack.qty);
  const costTotal = packTotal(item.buying_price, pack.qty);

  return (
    <Section title={t("items.packings")}>
      <div className="space-y-2">
        <Select value={String(index)} onValueChange={(v) => setIndex(Number(v))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {packings.map((p, i) => (
              <SelectItem key={`${p.label}-${i}`} value={String(i)}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="rounded-xl well border border-white/20 px-4 py-1">
          <Field label={t("items.packingContains", { packing: pack.label })}>
            <span dir="ltr" className="tabular-nums">
              {pack.qty} {unit}
            </span>
          </Field>
          {costTotal != null ? (
            <Field label={t("items.packingBuyingTotal")}>
              <Money value={costTotal} />
            </Field>
          ) : null}
          <Field label={t("items.packingSellingTotal")}>
            <Money value={sellTotal} className="font-extrabold" />
          </Field>
          {/* The workings, so the total is checkable at a glance. */}
          <Field label={t("items.packingRate")}>
            <span dir="ltr" className="tabular-nums">
              {formatPKR(item.selling_price)} x {pack.qty}
            </span>
          </Field>
        </div>
      </div>
    </Section>
  );
}

/**
 * The body of the item-detail view (gallery + key facts + suppliers + history +
 * edit). Shared by the mobile detail dialog and the desktop master-detail side
 * panel so both stay identical.
 */
export function ItemDetailBody({ item }: { item: Item }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const router = useRouter();
  const isSuperAdmin = useIsSuperAdmin();
  const { openDialog } = useDialogManager();

  const { data: stock, isLoading: stockLoading } = useItemStock(item.id);
  const { data: suppliers = [], isLoading: suppliersLoading } = useItemSuppliers(item.id);
  const { data: entries = [], isLoading: entriesLoading } = useStockEntries(item.id);

  const images = item.image_urls?.length ? item.image_urls : item.image_url ? [item.image_url] : [];
  const recent = entries.slice(0, 5);
  const packings = React.useMemo(() => itemPackings(item), [item]);

  // Share the item's cover photo + name to a supplier via the device's native
  // share sheet (WhatsApp, SMS, email, Bluetooth — whatever the admin picks).
  //
  // The cover image (first image) is prefetched into a File as soon as the detail
  // opens. This is essential: the Web Share API must be invoked synchronously from
  // the click's user gesture, so we can't `await fetch()` inside the handler — that
  // consumes the gesture and the share silently fails (which is why items WITH an
  // image gave no options). With the file ready ahead of time, the click shares
  // immediately.
  const coverUrl = images[0];
  // Cached alongside its URL so a stale file from a previously-viewed item is never
  // shared once the selection changes.
  const [cover, setCover] = React.useState<{ url: string; file: File } | null>(null);
  React.useEffect(() => {
    if (!coverUrl) return;
    let active = true;
    (async () => {
      try {
        const { data: blob } = await axios.get<Blob>(coverUrl, { responseType: "blob" });
        const ext = (blob.type.split("/")[1] || "jpg").split("+")[0];
        const file = new File([blob], `${item.name_en || "item"}.${ext}`, {
          type: blob.type || "image/jpeg",
        });
        if (active) setCover({ url: coverUrl, file });
      } catch {
        // offline/CORS — we'll share the link instead
      }
    })();
    return () => {
      active = false;
    };
  }, [coverUrl, item.name_en]);

  const isAbort = (err: unknown) => (err as Error)?.name === "AbortError";

  async function shareItem() {
    const name = displayName(item, language);
    const coverFile = cover?.url === coverUrl ? cover.file : null;
    const link = coverUrl;

    // 1) Native share with the actual cover image attached.
    if (coverFile && navigator.canShare?.({ files: [coverFile] }) && navigator.share) {
      try {
        await navigator.share({ title: name, text: name, files: [coverFile] });
        return;
      } catch (err) {
        if (isAbort(err)) return; // user closed the sheet — done
        // otherwise fall through to a text share
      }
    }

    // 2) Native share with text (+ image link so it still previews).
    if (navigator.share) {
      try {
        await navigator.share({ title: name, text: [name, link].filter(Boolean).join("\n") });
        return;
      } catch (err) {
        if (isAbort(err)) return;
        // fall through to the WhatsApp/clipboard fallback
      }
    }

    // 3) No Web Share API (or it failed) — open WhatsApp prefilled; if the popup is
    // blocked, copy the details so the admin can paste them anywhere.
    const msg = [name, link].filter(Boolean).join("\n");
    const win = window.open(
      `https://wa.me/?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noopener",
    );
    if (!win) {
      try {
        await navigator.clipboard.writeText(msg);
        toast.success(t("items.shareCopied"));
      } catch {
        toast.error(t("items.shareFailed"));
      }
    }
  }

  return (
    <div className="space-y-5">
      {/* Image gallery — shadcn carousel */}
      {images.length > 0 && (
        <Carousel className="mx-auto w-[calc(100%-1.5rem)]" opts={{ loop: images.length > 1 }}>
          <CarouselContent>
            {images.map((url) => (
              <CarouselItem key={url}>
                <div className="flex h-52 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
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
      <div className="rounded-xl well border border-white/20 px-4 py-1">
        <Field label={t("warehouse.currentStock")}>
          {stockLoading ? (
            <Skeleton className="h-4 w-16" />
          ) : (
            formatQuantity(item, stock ?? 0, (k) => t(`units.${k}`))
          )}
        </Field>
        {item.sku ? <Field label={t("fields.sku")}>{item.sku}</Field> : null}
        <Field label={t("fields.unit")}>{t(`units.${item.primary_unit}`)}</Field>
        <Field label={t("fields.measurementType")}>{t(`measurement.${item.measurement_type}`)}</Field>
        {hasSubUnit(item) ? (
          <Field label={t("items.packSize")}>
            <span dir="ltr">
              {item.base_per_primary} {t(`units.${item.base_unit}`)} / {t(`units.${item.primary_unit}`)}
            </span>
          </Field>
        ) : null}
        {/* Cost above price, matching the items grid — the two read together. */}
        <Field label={t("fields.buyingPrice")}>
          {item.buying_price != null ? (
            <Money value={item.buying_price} />
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </Field>
        <Field label={t("fields.sellingPrice")}>
          <Money value={item.selling_price} />
        </Field>
        {item.low_stock_threshold != null ? (
          <Field label={t("items.lowStockAlertNoUnit")}>
            <span dir="ltr" className="tabular-nums">
              {item.low_stock_threshold} {t(`units.${item.primary_unit}`)}
            </span>
          </Field>
        ) : null}
        <Field label={t("items.trackInWarehouse")}>
          <StatusBadge
            tone={item.track_in_warehouse ? "success" : "muted"}
            label={t(item.track_in_warehouse ? "items.tracked" : "items.notTracked")}
          />
        </Field>
        <Field label={t("fields.addedOn")}>{formatDateTime(item.created_at)}</Field>
      </div>

      {/* Pack pricing — only when the item actually has packing styles */}
      {packings.length > 0 ? <PackingPicker item={item} packings={packings} /> : null}

      {/* Suppliers that have sourced this item */}
      {suppliersLoading ? (
        <Section title={t("suppliers.title")}>
          <Skeleton className="h-7 w-40 rounded-full" />
        </Section>
      ) : suppliers.length > 0 ? (
        <Section title={t("suppliers.title")}>
          <div className="flex flex-wrap gap-2">
            {suppliers.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => router.push(`/suppliers?supplierId=${s.id}`)}
                className="rounded-full well border border-white/20 px-3 py-1 text-xs font-medium text-primary transition hover:bg-secondary/70 hover:underline"
              >
                {s.name}
              </button>
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
          <ul className="divide-y divide-border rounded-xl border border-border">
            {recent.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="text-muted-foreground">{formatDate(e.entry_date)}</span>
                <span className="flex items-center gap-2">
                  <StatusBadge
                    tone={e.type === StockEntryType.In ? "success" : "danger"}
                    label={t(e.type === StockEntryType.In ? "warehouse.stockIn" : "warehouse.stockOut")}
                  />
                  <span dir="ltr" className="font-medium tabular-nums">
                    {e.type === StockEntryType.In ? "+" : "−"}
                    {formatQuantity(item, Number(e.quantity), (k) => t(`units.${k}`))}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <div className="space-y-2">
        {/* Share the item's photo + name to a supplier via any app. The label +
            tooltip make it clear this shares *this* item. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button className="w-full" onClick={shareItem}>
              <Share2 className="-ms-1 me-1 h-4 w-4" />
              {t("items.shareWithSupplier")}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("items.shareTooltip")}</TooltipContent>
        </Tooltip>

        {isSuperAdmin && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => openDialog(DialogKey.ItemForm, { item })}
          >
            <Icon3D name="pencil" size={24} className="-ms-1 me-1" alt="" />
            {t("pricing.editItem")}
          </Button>
        )}
      </div>
    </div>
  );
}
