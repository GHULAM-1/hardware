"use client";

import * as React from "react";
import { Plus, PackagePlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { FormDialog } from "@/components/dialogs/form-dialog";
import { SupplierCombobox } from "@/components/common/supplier-combobox";
import { SupplierOrderLineRow } from "@/components/supplier-orders/supplier-order-line-row";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VoiceInputButton } from "@/components/common/voice-input-button";
import { supplierOrderSchema } from "@/lib/schemas";
import { LOW_STOCK_THRESHOLD } from "@/lib/status-meta";
import { useCreateSupplierOrder } from "@/hooks/use-supplier-orders";
import { useItemsWithStock } from "@/hooks/use-warehouse";
import {
  newLine,
  lineFromItem,
  type SupplierOrderLineDraft,
} from "@/components/supplier-orders/supplier-order-form-types";

export function SupplierOrderFormDialog({ onClose }: DialogComponentProps<null>) {
  const { t } = useTranslation();
  const create = useCreateSupplierOrder();
  const { data: stockItems = [] } = useItemsWithStock("");

  const [supplierId, setSupplierId] = React.useState<string | null>(null);
  const [lines, setLines] = React.useState<SupplierOrderLineDraft[]>([newLine()]);
  const [note, setNote] = React.useState("");

  function updateLine(key: string, next: SupplierOrderLineDraft) {
    setLines((ls) => ls.map((l) => (l.key === key ? next : l)));
  }

  function addLowStock() {
    const low = stockItems.filter((i) => i.quantity <= LOW_STOCK_THRESHOLD);
    if (!low.length) {
      toast.info(t("supplierOrders.noLowStock"));
      return;
    }
    setLines((ls) => {
      const present = new Set(ls.map((l) => l.item?.id).filter(Boolean));
      const additions = low.filter((i) => !present.has(i.id)).map(lineFromItem);
      // Drop a single leading empty line so the seed isn't preceded by a blank row.
      const base = ls.length === 1 && !ls[0].item ? [] : ls;
      return additions.length ? [...base, ...additions] : ls;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lines.some((l) => l.item && Number(l.quantity) > 0)) {
      toast.error(t("supplierOrders.addAtLeastOneItem"));
      return;
    }

    const payload = {
      supplier_id: supplierId,
      note: note || null,
      lines: lines
        .filter((l) => l.item && Number(l.quantity) > 0)
        .map((l) => ({
          item_id: l.item!.id,
          quantity: l.quantity,
          unit: l.unit || l.item!.unit,
          note: l.note || null,
        })),
    };

    const parsed = supplierOrderSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t("common.required"));
      return;
    }
    try {
      await create.mutateAsync(parsed.data);
      toast.success(t("toast.created"));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.error"));
    }
  }

  return (
    <FormDialog
      title={t("supplierOrders.newOrder")}
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={create.isPending}
      submitLabel={t("common.create")}
      widthClassName="w-[calc(100%-2rem)] sm:max-w-3xl"
    >
      <div className="space-y-5">
        {/* Supplier (optional) */}
        <div className="space-y-2">
          <Label>
            {t("fields.supplier")}
            <span className="ms-1 text-muted-foreground">({t("common.optional")})</span>
          </Label>
          <SupplierCombobox value={supplierId} onChange={(v) => setSupplierId(v)} />
        </div>

        {/* Lines */}
        <div className="space-y-3">
          {lines.map((line, i) => (
            <SupplierOrderLineRow
              key={line.key}
              line={line}
              index={i}
              onChange={(next) => updateLine(line.key, next)}
              onRemove={() =>
                setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== line.key) : ls))
              }
            />
          ))}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setLines((ls) => [...ls, newLine()])}>
              <Plus className="me-1 h-4 w-4" />
              {t("supplierOrders.addItem")}
            </Button>
            <Button type="button" variant="outline" onClick={addLowStock}>
              <PackagePlus className="me-1 h-4 w-4" />
              {t("supplierOrders.addLowStock")}
            </Button>
          </div>
        </div>

        {/* Order note (optional) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>
              {t("supplierOrders.orderNote")}
              <span className="ms-1 text-muted-foreground">({t("common.optional")})</span>
            </Label>
            <VoiceInputButton
              onText={(text) => setNote((n) => (n ? `${n} ${text}` : text))}
            />
          </div>
          <Textarea
            value={note}
            placeholder={t("supplierOrders.orderNotePlaceholder")}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>
    </FormDialog>
  );
}
