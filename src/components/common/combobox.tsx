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

export type ComboboxOption = { value: string; label: string };

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
    setOpen(false);
    setQuery("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
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
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={!serverFiltered}>
          <CommandInput
            placeholder={t("common.searchPlaceholder")}
            value={query}
            onValueChange={handleQueryChange}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {!showCreate && <CommandEmpty>{t("common.noResults")}</CommandEmpty>}
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={serverFiltered ? option.value : option.label}
                      onSelect={() => {
                        setPicked(option);
                        onChange(option.value, option);
                        setOpen(false);
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
