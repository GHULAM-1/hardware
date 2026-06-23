"use client";

import * as React from "react";
import { Plus, PackagePlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { FormDialog } from "@/components/dialogs/form-dialog";
import { SupplierOrderLineRow } from "@/components/supplier-orders/supplier-order-line-row";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VoiceInputButton } from "@/components/common/voice-input-button";
import { supplierOrderSchema } from "@/lib/schemas";
import { thresholdBase } from "@/lib/units";
import {
  useCreateSupplierOrder,
  useSupplierOrder,
  useUpdateSupplierOrder,
} from "@/hooks/use-supplier-orders";
import { useItemsWithStock } from "@/hooks/use-warehouse";
import {
  newLine,
  lineFromItem,
  linesFromOrder,
  type SupplierOrderLineDraft,
} from "@/components/supplier-orders/supplier-order-form-types";

/** Null = create; { id } = edit an existing order (editable at any status). */
export type SupplierOrderFormPayload = { id: string } | null;

export function SupplierOrderFormDialog({
  payload,
  onClose,
}: DialogComponentProps<SupplierOrderFormPayload>) {
  const { t } = useTranslation();
  const editId = payload?.id ?? null;
  const create = useCreateSupplierOrder();
  const update = useUpdateSupplierOrder();
  const { data: existing, isLoading: loadingExisting } = useSupplierOrder(editId ?? undefined);
  const { data: stockItems = [] } = useItemsWithStock("");

  const [lines, setLines] = React.useState<SupplierOrderLineDraft[]>([newLine()]);
  const [note, setNote] = React.useState("");
  // Prefill once the order being edited has loaded.
  const hydrated = React.useRef(false);
  React.useEffect(() => {
    if (editId && existing && !hydrated.current) {
      hydrated.current = true;
      setLines(existing.lines.length ? linesFromOrder(existing) : [newLine()]);
      setNote(existing.note ?? "");
    }
  }, [editId, existing]);

  function updateLine(key: string, next: SupplierOrderLineDraft) {
    setLines((ls) => ls.map((l) => (l.key === key ? next : l)));
  }

  function addLowStock() {
    // Tracked items that are out of stock or at/below their own low-stock level.
    const low = stockItems.filter((i) => {
      if (!i.track_in_warehouse) return false;
      const tBase = thresholdBase(i);
      return i.quantity <= 0 || (tBase != null && i.quantity <= tBase);
    });
    if (!low.length) {
      toast.info(t("supplierOrders.noLowStock"));
      return;
    }
    setLines((ls) => {
      const present = new Set(ls.map((l) => l.itemId).filter(Boolean));
      const additions = low.filter((i) => !present.has(i.id)).map(lineFromItem);
      // Drop a single leading empty line so the seed isn't preceded by a blank row.
      const base = ls.length === 1 && !ls[0].itemId ? [] : ls;
      return additions.length ? [...base, ...additions] : ls;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lines.some((l) => l.itemId && Number(l.quantity) > 0)) {
      toast.error(t("supplierOrders.addAtLeastOneItem"));
      return;
    }

    const payloadValues = {
      note: note || null,
      lines: lines
        .filter((l) => l.itemId && Number(l.quantity) > 0)
        .map((l) => ({
          ...(l.id ? { id: l.id } : {}),
          item_id: l.itemId!,
          supplier_id: l.supplierId,
          quantity: l.quantity,
          unit: l.unit || "pcs",
          note: l.note || null,
        })),
    };

    const parsed = supplierOrderSchema.safeParse(payloadValues);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t("common.required"));
      return;
    }
    try {
      if (editId) {
        await update.mutateAsync({ id: editId, values: parsed.data });
        toast.success(t("toast.saved"));
      } else {
        await create.mutateAsync(parsed.data);
        toast.success(t("toast.created"));
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.error"));
    }
  }

  return (
    <FormDialog
      title={editId ? t("supplierOrders.editOrder") : t("supplierOrders.newOrder")}
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={create.isPending || update.isPending}
      submitLabel={editId ? t("common.save") : t("common.create")}
      dirty={lines.some((l) => l.itemId) || note.trim() !== ""}
      widthClassName="w-[calc(100%-2rem)] sm:max-w-3xl"
    >
      {editId && loadingExisting ? (
        <p className="py-10 text-center text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <div className="space-y-5">
          {/* Lines — each carries its own supplier (one item ↔ one supplier). */}
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
              <Button
                type="button"
                variant="outline"
                onClick={() => setLines((ls) => [...ls, newLine()])}
              >
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
              <VoiceInputButton onText={(text) => setNote((n) => (n ? `${n} ${text}` : text))} />
            </div>
            <Textarea
              value={note}
              placeholder={t("supplierOrders.orderNotePlaceholder")}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
      )}
    </FormDialog>
  );
}
