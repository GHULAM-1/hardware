"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  Contact,
  Maximize2,
  Mic,
  Minimize2,
  PackageSearch,
  ShoppingCart,
  Square,
  User,
  X as XIcon,
} from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { useLanguage } from "@/providers/i18n-provider";
import { useDebounce } from "@/hooks/use-debounce";
import { useGlobalSearch } from "@/hooks/use-global-search";
import { useSpeechRecognition } from "@/components/assistant/use-speech-recognition";
import { displayName } from "@/lib/display";
import { scrollRegionClass, scrollRegionProps } from "@/lib/a11y";
import { cn } from "@/lib/utils";
import type { Language } from "@/lib/enums";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ImageThumb } from "@/components/common/image-thumb";
import { Money } from "@/components/common/money";
import { StatusBadge } from "@/components/common/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ItemDetailBody } from "@/components/warehouse/item-detail-body";
import { CustomerDetailBody } from "@/components/details/customer-detail-body";
import { OrderDetailBody } from "@/components/details/order-detail-body";
import { StaffDetailBody } from "@/components/details/staff-detail-body";
import type { Customer, Item, OrderListView, Staff } from "@/types/models";

const winBtn =
  "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

// What's shown in the detail pane — one of the four searchable entities.
type Selected =
  | { type: "item"; data: Item }
  | { type: "customer"; data: Customer }
  | { type: "order"; data: OrderListView }
  | { type: "staff"; data: Staff };

/**
 * Quick search — the app's global search (items, customers, orders, staff) in a
 * two-pane shell where the selected result's full detail previews inline, so no
 * second dialog is needed. Desktop shows list + preview side by side; mobile is a
 * drill-in. Maximisable like the app's other dialogs. Searches on demand (nothing
 * loads until the user types). Read-only admins only see items.
 */
export function ItemQuickSearchDialog({ onClose }: DialogComponentProps<null>) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<Selected | null>(null);
  const [maximized, setMaximized] = React.useState(false);
  // The search box is focused the instant the dialog opens (Ctrl+K → type),
  // instead of Radix landing focus on the first window button. See the
  // onOpenAutoFocus handler on DialogContent below.
  const inputRef = React.useRef<HTMLInputElement>(null);
  // Voice: spoken words land in the box and the debounced query filters as usual
  // (no forced submit). Carried over when this replaced the top-bar palette.
  const { supported: micSupported, listening, start, stop } = useSpeechRecognition(setQuery);
  const debounced = useDebounce(query).trim();
  const searching = debounced.length > 0;

  // Same batched search as the top-bar palette — one request for all four result
  // sets, and only once the user has typed (no preloading the whole catalog).
  // Non-item types are super-admin only; the hook handles that gating.
  const searchQ = useGlobalSearch(debounced, searching);

  const itemRows = searchQ.data?.items ?? [];
  const customerRows = searchQ.data?.customers ?? [];
  const orderRows = searchQ.data?.orders ?? [];
  const staffRows = searchQ.data?.staff ?? [];
  const hasResults =
    itemRows.length > 0 ||
    customerRows.length > 0 ||
    orderRows.length > 0 ||
    staffRows.length > 0;
  const loading = searchQ.isFetching;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        plain
        showCloseButton={false}
        // Radix otherwise focuses the first tabbable node (a window button), so
        // the user had to click the box before typing. Take over the open-focus
        // and put the caret straight in the search input, ready to type.
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
        className={cn(
          "flex flex-col overflow-hidden p-0",
          // Own maximize state (the shared one drops custom classes when maximized,
          // which would break this fixed two-pane layout). Both states stay centered
          // via the base translate; maximized fills the viewport with a small inset.
          maximized
            ? "inset-3 top-3 left-3 h-auto max-h-none w-auto max-w-none translate-x-0 translate-y-0 rounded-2xl sm:max-w-none"
            : "h-[85dvh] max-h-[85dvh] w-[calc(100%-1rem)] rounded-2xl sm:max-w-4xl",
        )}
      >
        <DialogTitle className="sr-only">{t("quickSearch.title")}</DialogTitle>
        <DialogDescription className="sr-only">{t("globalSearch.placeholder")}</DialogDescription>

        {/* Window controls — maximize/restore + close, matching the app's dialogs. */}
        <div className="absolute end-2 top-2 z-20 flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setMaximized((v) => !v)}
            aria-label={maximized ? t("common.restore") : t("common.maximize")}
            title={maximized ? t("common.restore") : t("common.maximize")}
            className={winBtn}
          >
            {maximized ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
          <DialogPrimitive.Close
            aria-label={t("common.close")}
            className={cn(winBtn, "hover:bg-destructive hover:text-white")}
          >
            <XIcon className="size-4" />
          </DialogPrimitive.Close>
        </div>

        <div className="flex min-h-0 flex-1 md:flex-row">
          {/* LIST PANE — hidden on mobile once a result is previewed. */}
          <div
            className={cn(
              "flex min-h-0 min-w-0 flex-1 flex-col md:w-[44%] md:max-w-[44%] md:flex-none md:border-e md:border-border",
              selected && "hidden md:flex",
            )}
          >
            <Command shouldFilter={false} className="flex min-h-0 flex-1 flex-col rounded-none">
              <div className="relative">
                <CommandInput
                  ref={inputRef}
                  value={query}
                  onValueChange={setQuery}
                  placeholder={t(listening ? "assistant.listening" : "globalSearch.placeholder")}
                  // Reserve space for the window buttons on mobile (they overlay the
                  // top-right); on desktop they sit over the detail pane instead.
                  className={cn("h-12 pe-16 md:pe-3", micSupported && "md:pe-12")}
                />
                {micSupported && (
                  <button
                    type="button"
                    onClick={() => (listening ? stop() : start())}
                    aria-label={t(listening ? "assistant.listening" : "assistant.speak")}
                    title={t(listening ? "assistant.listening" : "assistant.speak")}
                    className={cn(
                      "absolute end-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md transition-colors md:flex",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      listening
                        ? "bg-primary text-primary-foreground"
                        : "text-white/80 hover:bg-white/20 hover:text-white",
                    )}
                  >
                    {listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                )}
              </div>
              {/* Override cmdk's default max-h-[300px] so the list fills the pane. */}
              <CommandList className="max-h-none min-h-0 flex-1 overflow-y-auto">
                {!searching ? (
                  <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                    <PackageSearch className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{t("globalSearch.hint")}</p>
                  </div>
                ) : loading && !hasResults ? (
                  <div className="space-y-1 p-2">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-md px-2 py-2">
                        <Skeleton className="h-9 w-9 rounded-md" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3.5 w-2/3" />
                          <Skeleton className="h-3 w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !hasResults ? (
                  <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                    <PackageSearch className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{t("globalSearch.empty")}</p>
                  </div>
                ) : (
                  <>
                    {itemRows.length > 0 && (
                      <CommandGroup heading={t("globalSearch.items")}>
                        {itemRows.map((item) => (
                          <CommandItem
                            key={item.id}
                            value={`item-${item.id}`}
                            onSelect={() => setSelected({ type: "item", data: item })}
                            className={cn(
                              "cursor-pointer gap-3 rounded-lg px-2 py-2",
                              selected?.type === "item" && selected.data.id === item.id && "bg-accent",
                            )}
                          >
                            <ImageThumb src={item.image_urls?.[0] ?? item.image_url} alt={item.name_en} />
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate text-sm font-semibold text-foreground">
                                {displayName(item, language)}
                              </span>
                              <span className="truncate text-xs text-muted-foreground">{item.sku}</span>
                            </span>
                            {/* Cost then price, stacked and labelled so the two
                                figures can't be mistaken for one another. */}
                            <span className="flex shrink-0 flex-col items-end leading-tight">
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                {t("fields.buyingPrice")}
                              </span>
                              {item.buying_price != null ? (
                                <Money
                                  value={item.buying_price}
                                  className="text-xs font-semibold text-muted-foreground"
                                />
                              ) : (
                                <span className="text-xs font-semibold text-muted-foreground">—</span>
                              )}
                              <span className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                {t("fields.sellingPrice")}
                              </span>
                              <Money value={item.selling_price} className="text-sm font-extrabold text-white" />
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}

                    {customerRows.length > 0 && (
                      <CommandGroup heading={t("globalSearch.customers")}>
                        {customerRows.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={`customer-${customer.id}`}
                            onSelect={() => setSelected({ type: "customer", data: customer })}
                            className={cn(
                              "cursor-pointer gap-3 rounded-lg px-2 py-2",
                              selected?.type === "customer" &&
                                selected.data.id === customer.id &&
                                "bg-accent",
                            )}
                          >
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate text-sm">{displayName(customer, language)}</span>
                            {customer.phone && (
                              <span className="ms-auto shrink-0 text-xs text-muted-foreground" dir="ltr">
                                {customer.phone}
                              </span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}

                    {staffRows.length > 0 && (
                      <CommandGroup heading={t("globalSearch.staff")}>
                        {staffRows.map((s) => (
                          <CommandItem
                            key={s.id}
                            value={`staff-${s.id}`}
                            onSelect={() => setSelected({ type: "staff", data: s })}
                            className={cn(
                              "cursor-pointer gap-3 rounded-lg px-2 py-2",
                              selected?.type === "staff" && selected.data.id === s.id && "bg-accent",
                            )}
                          >
                            <Contact className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate text-sm">{s.name}</span>
                            <span className="ms-auto shrink-0 text-xs text-muted-foreground" dir="ltr">
                              {s.phone}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}

                    {orderRows.length > 0 && (
                      <CommandGroup heading={t("globalSearch.orders")}>
                        {orderRows.map((order) => (
                          <CommandItem
                            key={order.id}
                            value={`order-${order.id}`}
                            onSelect={() => setSelected({ type: "order", data: order })}
                            className={cn(
                              "cursor-pointer gap-3 rounded-lg px-2 py-2",
                              selected?.type === "order" && selected.data.id === order.id && "bg-accent",
                            )}
                          >
                            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate text-sm">
                              #{order.order_no}
                              {order.customer ? ` · ${displayName(order.customer, language)}` : ""}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </>
                )}
              </CommandList>
            </Command>
          </div>

          {/* DETAIL PANE — inline preview. Hidden on mobile until a result is picked. */}
          <div
            className={cn(
              "flex min-h-0 min-w-0 flex-1 flex-col bg-muted/20",
              !selected && "hidden md:flex",
            )}
          >
            {selected ? (
              <>
                <div className="flex items-center gap-2 border-b border-border bg-background/60 px-3 py-2.5 pe-3 md:pe-16">
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    aria-label={t("common.back")}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
                  >
                    <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
                  </button>
                  <DetailHeader selected={selected} language={language} />
                </div>
                {/* Focusable so Up/Down scroll the preview after a click — see
                    scrollRegionProps. The list pane next door already handles its
                    own arrow keys (cmdk moves the selection), so only this pane
                    needs it. */}
                <div
                  {...scrollRegionProps(t("pricing.itemDetail"))}
                  className={cn("min-h-0 flex-1 overflow-y-auto p-4", scrollRegionClass)}
                >
                  {selected.type === "item" && <ItemDetailBody item={selected.data} />}
                  {selected.type === "customer" && <CustomerDetailBody customer={selected.data} />}
                  {selected.type === "order" && <OrderDetailBody orderId={selected.data.id} />}
                  {selected.type === "staff" && (
                    <StaffDetailBody staff={selected.data} onNavigate={onClose} />
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <PackageSearch className="h-10 w-10 text-muted-foreground/70" />
                <p className="max-w-[220px] text-sm text-muted-foreground">
                  {t("quickSearch.selectPrompt")}
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The detail-pane title bar content, per entity type. */
function DetailHeader({ selected, language }: { selected: Selected; language: Language }) {
  const { t } = useTranslation();
  if (selected.type === "item") {
    return (
      <>
        <ImageThumb src={selected.data.image_urls?.[0] ?? selected.data.image_url} alt={selected.data.name_en} />
        <span className="min-w-0 truncate text-base font-extrabold text-white">
          {displayName(selected.data, language)}
        </span>
      </>
    );
  }
  if (selected.type === "customer") {
    return (
      <span className="min-w-0 truncate text-base font-extrabold text-white">
        {displayName(selected.data, language)}
      </span>
    );
  }
  if (selected.type === "staff") {
    return (
      <>
        <ImageThumb src={selected.data.image_url} alt={selected.data.name} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-base font-extrabold leading-tight text-white">
            {selected.data.name}
          </span>
          <StatusBadge
            tone={selected.data.is_active ? "success" : "muted"}
            label={selected.data.is_active ? t("staff.active") : t("staff.inactive")}
            className="mt-0.5 self-start"
          />
        </span>
      </>
    );
  }
  // order
  return (
    <span className="min-w-0 truncate font-mono text-base font-extrabold text-white">
      #{selected.data.order_no}
    </span>
  );
}
