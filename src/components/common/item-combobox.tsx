"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";

import { Combobox, type ComboboxOption } from "@/components/common/combobox";
import { useDebounce } from "@/hooks/use-debounce";
import { useItems } from "@/hooks/use-items";
import { useLanguage } from "@/providers/i18n-provider";
import { displayName } from "@/lib/display";
import type { Item } from "@/types/models";

/**
 * Item picker for order lines: typeable, live-filtering, selects an EXISTING item
 * (new items are created in Pricing). Returns the full item so the caller can
 * prefill unit + selling price.
 */
export function ItemCombobox({
  value,
  onSelect,
}: {
  value: string | null;
  onSelect: (item: Item | null) => void;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [search, setSearch] = React.useState("");
  const debounced = useDebounce(search);
  const { data = [], isLoading } = useItems(debounced);

  const options: ComboboxOption[] = data.map((i) => ({ value: i.id, label: displayName(i, language) }));

  return (
    <Combobox
      options={options}
      value={value}
      onChange={(v) => onSelect(data.find((i) => i.id === v) ?? null)}
      onSearchChange={setSearch}
      loading={isLoading}
      placeholder={t("fields.item")}
    />
  );
}
