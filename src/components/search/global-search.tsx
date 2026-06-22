"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Contact, Loader2, Mic, Package, Search, ShoppingCart, Square, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { displayName } from "@/lib/display";
import { getAccessToken } from "@/lib/auth-token";
import { useDebounce } from "@/hooks/use-debounce";
import { useLanguage } from "@/providers/i18n-provider";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { useSpeechRecognition } from "@/components/assistant/use-speech-recognition";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { DialogKey } from "@/lib/dialog-keys";
import { listItems } from "@/server/actions/items";
import { listCustomers } from "@/server/actions/customers";
import { listOrders } from "@/server/actions/orders";
import { listStaff } from "@/server/actions/staff";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

/**
 * The app's real global search — a Cmd/Ctrl+K command palette over items,
 * customers and orders. This is intentionally NOT the AI: it runs the existing
 * RLS-scoped search actions and drills into the matching detail (item → pricing,
 * customer → profile dialog, order → receipt). Read-only admins only search
 * items (no revenue/customer data). Voice input is added in a later step.
 */
export function GlobalSearch() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isSuperAdmin = useIsSuperAdmin();
  const { openDialog } = useDialogManager();

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const debounced = useDebounce(query).trim();
  const active = open && debounced.length > 0;

  // Voice: drop the spoken words into the box (YouTube-style) and let the
  // debounced query auto-filter results. No forced submit.
  const { supported: micSupported, listening, start, stop } = useSpeechRecognition(setQuery);

  // Open/close the palette, clearing the query each time it closes so it opens fresh.
  const setPaletteOpen = React.useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) {
        setQuery("");
        stop();
      }
    },
    [stop],
  );

  // Cmd/Ctrl+K toggles the palette.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setPaletteOpen]);

  const items = useQuery({
    queryKey: ["global-search", "items", debounced],
    queryFn: async () => listItems(await getAccessToken(), debounced),
    enabled: active,
  });
  const customers = useQuery({
    queryKey: ["global-search", "customers", debounced],
    queryFn: async () => listCustomers(await getAccessToken(), debounced),
    enabled: active && isSuperAdmin,
  });
  const orders = useQuery({
    queryKey: ["global-search", "orders", debounced],
    queryFn: async () => listOrders(await getAccessToken(), debounced),
    enabled: active && isSuperAdmin,
  });
  const staff = useQuery({
    queryKey: ["global-search", "staff", debounced],
    queryFn: async () => listStaff(await getAccessToken(), debounced),
    enabled: active && isSuperAdmin,
  });

  const loading =
    items.isFetching || customers.isFetching || orders.isFetching || staff.isFetching;
  const itemRows = items.data ?? [];
  const customerRows = customers.data ?? [];
  const orderRows = orders.data ?? [];
  const staffRows = staff.data ?? [];
  const hasResults =
    itemRows.length > 0 ||
    customerRows.length > 0 ||
    orderRows.length > 0 ||
    staffRows.length > 0;

  function close() {
    setPaletteOpen(false);
  }

  return (
    <>
      {/* Trigger: full search box on ≥sm, compact icon button on mobile. */}
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        aria-label={t("globalSearch.placeholder")}
        className={cn(
          "flex h-9 items-center gap-2 rounded-md border border-input bg-background text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
          "w-9 justify-center sm:w-full sm:justify-start sm:px-3",
        )}
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="hidden truncate sm:inline">{t("globalSearch.placeholder")}</span>
        <kbd className="ms-auto hidden rounded border border-border px-1.5 font-mono text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setPaletteOpen}>
        <DialogContent
          plain
          showCloseButton={false}
          className="w-[calc(100%-1.5rem)] overflow-hidden p-0 sm:max-w-xl"
        >
          <DialogTitle className="sr-only">{t("globalSearch.title")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("globalSearch.placeholder")}
          </DialogDescription>

          <Command
            shouldFilter={false}
            className="[&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12"
          >
            <div className="relative">
              <CommandInput
                value={query}
                onValueChange={setQuery}
                placeholder={t(listening ? "assistant.listening" : "globalSearch.placeholder")}
                className={micSupported ? "pe-12" : undefined}
              />
              {micSupported && (
                <button
                  type="button"
                  onClick={() => (listening ? stop() : start())}
                  aria-label={t(listening ? "assistant.listening" : "assistant.speak")}
                  title={t(listening ? "assistant.listening" : "assistant.speak")}
                  className={cn(
                    "absolute end-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    listening
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {listening ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
            <CommandList className="max-h-[60vh]">
              {!active ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t("globalSearch.hint")}
                </p>
              ) : loading && !hasResults ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("common.loading")}
                </div>
              ) : !hasResults ? (
                <CommandEmpty>{t("globalSearch.empty")}</CommandEmpty>
              ) : (
                <>
                  {itemRows.length > 0 && (
                    <CommandGroup heading={t("globalSearch.items")}>
                      {itemRows.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={`item-${item.id}`}
                          className="cursor-pointer"
                          onSelect={() => {
                            close();
                            openDialog(DialogKey.ItemDetail, { item });
                          }}
                        >
                          <Package className="h-4 w-4" />
                          <span className="truncate">{displayName(item, language)}</span>
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
                          className="cursor-pointer"
                          onSelect={() => {
                            close();
                            openDialog(DialogKey.CustomerProfile, { customer });
                          }}
                        >
                          <User className="h-4 w-4" />
                          <span className="truncate">{displayName(customer, language)}</span>
                          {customer.phone && (
                            <span className="ms-auto text-xs text-muted-foreground">
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
                          className="cursor-pointer"
                          onSelect={() => {
                            close();
                            openDialog(DialogKey.StaffDetail, { staff: s });
                          }}
                        >
                          <Contact className="h-4 w-4" />
                          <span className="truncate">{s.name}</span>
                          <span className="ms-auto text-xs text-muted-foreground" dir="ltr">
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
                          className="cursor-pointer"
                          onSelect={() => {
                            close();
                            openDialog(DialogKey.Receipt, { orderId: order.id });
                          }}
                        >
                          <ShoppingCart className="h-4 w-4" />
                          <span className="truncate">
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
        </DialogContent>
      </Dialog>
    </>
  );
}
