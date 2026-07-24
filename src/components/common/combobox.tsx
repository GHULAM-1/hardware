"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ComboboxOption = {
  value: string;
  label: string;
  /** Optional heading to file this option under. Options with no group render first. */
  group?: string;
  /** Extra text matched by the search box but not displayed (aliases, symbols). */
  keywords?: string;
};

/** Nearest ancestor that actually scrolls (the dialog body, a page column, …). */
function scrollableAncestor(el: HTMLElement | null): HTMLElement | null {
  for (let n = el?.parentElement ?? null; n; n = n.parentElement) {
    const { overflowY } = getComputedStyle(n);
    if ((overflowY === "auto" || overflowY === "scroll") && n.scrollHeight > n.clientHeight) {
      return n;
    }
  }
  return null;
}

/**
 * Hold a scroll container still for the few frames after the popover opens.
 *
 * cmdk auto-selects its first item on mount and calls
 * `scrollIntoView({block:"nearest"})` on it (see `ce()` in cmdk/dist/index.js).
 * `scrollIntoView` scrolls EVERY scrollable ancestor, not just the list. This
 * combobox's popover is not portaled — it has to stay inside the dialog's
 * scroll-lock tree so its own list can be scrolled — and `DialogContent` is
 * `-translate-x-1/2` transformed, which makes a transformed ancestor the
 * containing block for the `position: fixed` popover. So the popover belongs to
 * the dialog's scroll context, and on its first frame it sits at that context's
 * origin: "scroll it into view" therefore yanks the dialog back to the top.
 *
 * Rather than fight cmdk (it exposes no opt-out) or delay the list by a frame
 * (which flashes an empty popover), just pin the container's offset until the
 * popover has settled.
 */
function pinScrollDuringOpen(trigger: HTMLElement | null) {
  // The trigger is focused at the moment it's clicked, so activeElement is a
  // sound fallback if the ref hasn't attached — better than silently no-oping.
  const from = trigger ?? (document.activeElement as HTMLElement | null);
  const scroller = scrollableAncestor(from);
  if (!scroller) return;
  const { scrollTop, scrollLeft } = scroller;
  let frames = 0;
  const restore = () => {
    if (scroller.scrollTop !== scrollTop) scroller.scrollTop = scrollTop;
    if (scroller.scrollLeft !== scrollLeft) scroller.scrollLeft = scrollLeft;
    // A handful of frames covers Radix's positioning pass and cmdk's deferred
    // scroll without noticeably pinning against a real user scroll.
    if (++frames < 8) requestAnimationFrame(restore);
  };
  requestAnimationFrame(restore);
}

/**
 * Typeable, live-filtering select. The user types and the list filters as they
 * type (server-side when `onSearchChange` is provided, otherwise client-side).
 *
 * Pass `onCreate` to enable inline creation: when the typed text has no match, a
 * `+ add "<text>"` row appears. This single component covers both the plain
 * `Combobox` and the `ComboboxCreate` behaviour (DRY) — items, suppliers, customers.
 */
export function Combobox({
  options,
  value,
  onChange,
  onSearchChange,
  onCreate,
  loading = false,
  creating = false,
  placeholder,
  className,
  disabled = false,
}: {
  options: ComboboxOption[];
  value?: string | null;
  onChange: (value: string | null, option?: ComboboxOption) => void;
  /** Provide for server-side filtering; the query is debounced by the caller's hook. */
  onSearchChange?: (query: string) => void;
  /** Provide to enable inline "+ add" creation. Returns the created option to select it. */
  onCreate?: (name: string) => Promise<ComboboxOption | void> | void;
  loading?: boolean;
  creating?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  // Remember the picked option so the label persists even when it drops out of the
  // current (server-filtered) results — otherwise the trigger reverts to placeholder.
  const [picked, setPicked] = React.useState<ComboboxOption | null>(null);

  const selected =
    options.find((o) => o.value === value) ?? (picked && picked.value === value ? picked : null);
  const serverFiltered = Boolean(onSearchChange);

  function handleQueryChange(q: string) {
    setQuery(q);
    onSearchChange?.(q);
  }

  function handleOpenChange(next: boolean) {
    // Capture the scroll offset BEFORE the popover mounts, so the frames in
    // which Radix positions it and cmdk scrolls its first item into view can't
    // move the dialog underneath the user.
    if (next) pinScrollDuringOpen(triggerRef.current);
    setOpen(next);
    // Reset the (server-side) filter on close so the next open shows the full list,
    // not the leftover query from a prior search or inline create.
    if (!next && query) handleQueryChange("");
  }

  // Preserve the caller's ordering, but collect each heading's options together
  // so a long list (e.g. every unit in the catalog) stays scannable.
  const grouped = React.useMemo(() => {
    const byGroup = new Map<string, ComboboxOption[]>();
    for (const o of options) {
      const key = o.group ?? "";
      const bucket = byGroup.get(key);
      if (bucket) bucket.push(o);
      else byGroup.set(key, [o]);
    }
    return [...byGroup.entries()];
  }, [options]);

  const trimmed = query.trim();
  const hasExactMatch = options.some((o) => o.label.toLowerCase() === trimmed.toLowerCase());
  const showCreate = Boolean(onCreate) && trimmed.length > 0 && !hasExactMatch;

  async function handleCreate() {
    if (!onCreate) return;
    const created = await onCreate(trimmed);
    if (created) {
      setPicked(created);
      onChange(created.value, created);
    }
    handleOpenChange(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", !selected && "text-muted-foreground", className)}
        >
          <span className="truncate">{selected ? selected.label : placeholder ?? t("common.search")}</span>
          <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        portal={false}
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        // Opening this inside a scrolling dialog used to jerk the dialog back to
        // the top. Because the popover is NOT portaled (see popover.tsx — it has
        // to stay inside the dialog's scroll-lock tree so the list can scroll),
        // it mounts inline at the container's origin for one frame before the
        // positioning pass runs. Radix's default open-autofocus focuses it right
        // then, and the browser scrolls that origin — the top — into view.
        //
        // So: suppress the automatic focus and focus the search input ourselves
        // with preventScroll, which keeps the caret behaviour without the jump.
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus({ preventScroll: true });
        }}
      >
        <Command shouldFilter={!serverFiltered}>
          <CommandInput
            ref={inputRef}
            placeholder={t("common.searchPlaceholder")}
            value={query}
            onValueChange={handleQueryChange}
          />
          <CommandList className="max-h-[min(18rem,50vh)] overflow-y-auto overscroll-contain">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {!showCreate && <CommandEmpty>{t("common.noResults")}</CommandEmpty>}
                {grouped.map(([heading, groupOptions]) => (
                  <CommandGroup key={heading || "_"} heading={heading || undefined}>
                    {groupOptions.map((option) => (
                      <CommandItem
                        key={option.value}
                        value={serverFiltered ? option.value : option.label}
                        // Aliases ("kilo", "kg") match without cluttering the row.
                        keywords={option.keywords ? [option.keywords] : undefined}
                        onSelect={() => {
                          setPicked(option);
                          onChange(option.value, option);
                          handleOpenChange(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "me-2 h-4 w-4",
                            value === option.value ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="truncate">{option.label}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
                {showCreate && (
                  <CommandGroup>
                    <CommandItem value={`__create__${trimmed}`} onSelect={() => void handleCreate()}>
                      {creating ? (
                        <Loader2 className="me-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="me-2 h-4 w-4" />
                      )}
                      <span className="truncate">{t("common.addNamed", { name: trimmed })}</span>
                    </CommandItem>
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
