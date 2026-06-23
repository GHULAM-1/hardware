"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Combobox, type ComboboxOption } from "@/components/common/combobox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebounce } from "@/hooks/use-debounce";
import { useSuppliers, useItemSuppliers, useCreateSupplier } from "@/hooks/use-suppliers";
import { DUPLICATE_PHONE } from "@/lib/errors";
import { isPkPhone } from "@/lib/schemas";

/**
 * Supplier picker: typeable, live-filtering. `allowCreate` enables inline "+ add"
 * (used in warehouse/item-create). In orders it's false — suppliers are managed
 * in Warehouse, not created mid-order.
 *
 * Inline "+ add" opens a small self-contained dialog (name + phone) rather than
 * creating name-only: phone is the supplier unique key, so capturing it here lets
 * us prevent duplicates. The dialog is its own Radix Dialog (not the shared
 * DialogManager) so it stacks above the form the combobox lives in.
 */
export function SupplierCombobox({
  value,
  onChange,
  disabled,
  allowCreate = true,
  itemId,
}: {
  value: string | null;
  onChange: (value: string | null, option?: ComboboxOption) => void;
  disabled?: boolean;
  allowCreate?: boolean;
  /**
   * When set, the list is scoped to suppliers already associated with this item
   * (its stock-in history) instead of all suppliers. Inline "+ add" still works —
   * a new supplier is selectable immediately and associates on the next stock-in.
   */
  itemId?: string | null;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = React.useState("");
  const debounced = useDebounce(search);
  const scoped = itemId != null;
  const allSuppliers = useSuppliers(debounced);
  const itemSuppliers = useItemSuppliers(scoped ? itemId : null);
  const source = scoped ? itemSuppliers : allSuppliers;
  const data = source.data ?? [];
  const isLoading = source.isLoading;
  const create = useCreateSupplier();

  // Inline create dialog state. `draftName` non-null = dialog open.
  const [draftName, setDraftName] = React.useState<string | null>(null);
  const [phone, setPhone] = React.useState("");
  // Suppliers created inline this session — kept so they show + stay selectable
  // even before they appear in the (scoped) item-supplier list.
  const [created, setCreated] = React.useState<ComboboxOption[]>([]);

  const options: ComboboxOption[] = data.map((s) => ({ value: s.id, label: s.name }));
  for (const c of created) {
    if (!options.some((o) => o.value === c.value)) options.push(c);
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    // This mini-form is portaled but lives inside the parent form in the React tree;
    // without stopping propagation the submit bubbles up and submits that outer form
    // (e.g. closing the Edit-item dialog). Keep this create self-contained.
    e.stopPropagation();
    const name = (draftName ?? "").trim();
    if (!name) return;
    if (!isPkPhone(phone)) {
      toast.error(t("suppliers.invalidPhone"));
      return;
    }
    try {
      const s = await create.mutateAsync({
        name,
        phone,
        shop_name: null,
        address: null,
      });
      setCreated((c) => [...c, { value: s.id, label: s.name }]);
      onChange(s.id, { value: s.id, label: s.name });
      setDraftName(null);
      setPhone("");
    } catch (err) {
      if (err instanceof Error && err.message === DUPLICATE_PHONE) {
        toast.error(t("suppliers.duplicatePhone"));
      } else {
        toast.error(err instanceof Error ? err.message : t("toast.error"));
      }
    }
  }

  return (
    <>
      <Combobox
        options={options}
        value={value}
        onChange={onChange}
        onSearchChange={scoped ? undefined : setSearch}
        loading={isLoading}
        disabled={disabled}
        placeholder={t("fields.supplier")}
        onCreate={
          allowCreate
            ? (name) => {
                setPhone("");
                setDraftName(name);
              }
            : undefined
        }
      />

      <Dialog open={draftName !== null} onOpenChange={(open) => !open && setDraftName(null)}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-sm">
          <form onSubmit={submitCreate}>
            <DialogHeader>
              <DialogTitle>{t("suppliers.newSupplier")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="qa-supplier-name">{t("fields.name")}</Label>
                <Input
                  id="qa-supplier-name"
                  value={draftName ?? ""}
                  onChange={(e) => setDraftName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qa-supplier-phone">{t("fields.phone")}</Label>
                <Input
                  id="qa-supplier-phone"
                  type="tel"
                  dir="ltr"
                  inputMode="numeric"
                  maxLength={11}
                  placeholder="03001234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDraftName(null)}
                disabled={create.isPending}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={create.isPending || !(draftName ?? "").trim() || !isPkPhone(phone)}
              >
                {t("common.create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
