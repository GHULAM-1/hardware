"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";

import { Combobox, type ComboboxOption } from "@/components/common/combobox";
import { useDebounce } from "@/hooks/use-debounce";
import { useCustomers, useCreateCustomer } from "@/hooks/use-customers";
import { useLanguage } from "@/providers/i18n-provider";
import { displayName } from "@/lib/display";

/** Customer picker: typeable, live-filtering, inline "+ add". Reused in the order form. */
export function CustomerCombobox({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null, option?: ComboboxOption) => void;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [search, setSearch] = React.useState("");
  const debounced = useDebounce(search);
  const { data = [], isLoading } = useCustomers(debounced);
  const create = useCreateCustomer();

  const options: ComboboxOption[] = data.map((c) => ({ value: c.id, label: displayName(c, language) }));

  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      onSearchChange={setSearch}
      loading={isLoading}
      creating={create.isPending}
      placeholder={t("fields.customer")}
      onCreate={async (name) => {
        const c = await create.mutateAsync({
          name_en: name,
          name_ur: null,
          phone: null,
          address: null,
          is_blacklisted: false,
          notes: null,
        });
        return { value: c.id, label: c.name_en };
      }}
    />
  );
}
