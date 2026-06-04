"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";

import { Combobox, type ComboboxOption } from "@/components/common/combobox";
import { useDebounce } from "@/hooks/use-debounce";
import { useSuppliers, useCreateSupplier } from "@/hooks/use-suppliers";

/**
 * Supplier picker: typeable, live-filtering. `allowCreate` enables inline "+ add"
 * (used in warehouse/item-create). In orders it's false — suppliers are managed
 * in Warehouse, not created mid-order.
 */
export function SupplierCombobox({
  value,
  onChange,
  disabled,
  allowCreate = true,
}: {
  value: string | null;
  onChange: (value: string | null, option?: ComboboxOption) => void;
  disabled?: boolean;
  allowCreate?: boolean;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = React.useState("");
  const debounced = useDebounce(search);
  const { data = [], isLoading } = useSuppliers(debounced);
  const create = useCreateSupplier();

  const options: ComboboxOption[] = data.map((s) => ({ value: s.id, label: s.name }));

  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      onSearchChange={setSearch}
      loading={isLoading}
      creating={create.isPending}
      disabled={disabled}
      placeholder={t("fields.supplier")}
      onCreate={
        allowCreate
          ? async (name) => {
              const s = await create.mutateAsync({ name, phone: null, note: null, image_url: null });
              return { value: s.id, label: s.name };
            }
          : undefined
      }
    />
  );
}
