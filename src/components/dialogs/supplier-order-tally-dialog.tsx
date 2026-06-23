"use client";

import * as React from "react";
import { Check, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { useSupplierOrder, useSaveSupplierOrderTally } from "@/hooks/use-supplier-orders";
import { useLanguage } from "@/providers/i18n-provider";
import { displayName } from "@/lib/display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SupplierOrderLineView } from "@/types/models";

export type SupplierOrderTallyPayload = { id: string };

/** Record what actually arrived for a supplier order. Separate from the order detail. */
export function SupplierOrderTallyDialog({ payload, onClose }: DialogComponentProps<SupplierOrderTallyPayload>) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { data: order, isLoading } = useSupplierOrder(payload.id);
  const saveTally = useSaveSupplierOrderTally();

  // Per-line received-quantity inputs ("" = not tallied yet), seeded during render
  // (not an effect) so local edits aren't clobbered while the order is unchanged.
  const [recv, setRecv] = React.useState<Record<string, string>>({});
  const [seededFor, setSeededFor] = React.useState<string | null>(null);
  const seedKey = order
    ? `${order.id}|${order.lines.map((l) => `${l.id}:${l.received_quantity ?? ""}`).join(",")}`
    : null;
  if (order && seedKey !== seededFor) {
    setSeededFor(seedKey);
    setRecv(
      Object.fromEntries(
        order.lines.map((l) => [l.id, l.received_quantity == null ? "" : String(l.received_quantity)]),
      ),
    );
  }

  const groups = React.useMemo(() => {
    const m = new Map<string, { name: string | null; lines: SupplierOrderLineView[] }>();
    for (const l of order?.lines ?? []) {
      const key = l.supplier?.id ?? "__none__";
      if (!m.has(key)) m.set(key, { name: l.supplier?.name ?? null, lines: [] });
      m.get(key)!.lines.push(l);
    }
    return Array.from(m.values());
  }, [order]);

  function markAllReceived() {
    if (!order) return;
    setRecv(Object.fromEntries(order.lines.map((l) => [l.id, String(l.quantity)])));
  }

  async function onSaveTally() {
    if (!order) return;
    const entries = order.lines.map((l) => ({
      id: l.id,
      received_quantity: recv[l.id] === "" || recv[l.id] == null ? null : Number(recv[l.id]),
    }));
    try {
      await saveTally.mutateAsync({ id: payload.id, values: { entries, bill_url: null } });
      toast.success(t("supplierOrders.tallySaved"));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.error"));
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto overflow-x-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center justify-between gap-2 pe-6">
            <span>{t("supplierOrders.tally")}</span>
            {order && (
              <Button type="button" variant="ghost" size="sm" onClick={markAllReceived}>
                <Check className="me-1 h-4 w-4" />
                {t("supplierOrders.markAllReceived")}
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>{t("supplierOrders.manualStockHint")}</DialogDescription>
        </DialogHeader>

        {isLoading || !order ? (
          <p className="py-10 text-center text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <div className="min-w-0 space-y-4">
            {groups.map((g, gi) => (
              <div key={gi} className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  {g.name ?? t("supplierOrders.noSupplier")}
                </div>
                {g.lines.map((l) => {
                  const v = recv[l.id] ?? "";
                  const tallied = v !== "";
                  const complete = tallied && Number(v) >= Number(l.quantity);
                  return (
                    <div
                      key={l.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-border bg-background p-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {l.item ? displayName(l.item, language) : "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t("supplierOrders.ordered")}: {l.quantity} {t(`units.${l.unit}`)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            dir="ltr"
                            className="w-24"
                            value={v}
                            placeholder="0"
                            aria-label={t("supplierOrders.received")}
                            onChange={(e) =>
                              setRecv((r) => ({ ...r, [l.id]: e.target.value.replace(/\D/g, "") }))
                            }
                          />
                          <span className="whitespace-nowrap text-xs text-muted-foreground">
                            {t(`units.${l.unit}`)}
                          </span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={complete ? "secondary" : "outline"}
                          onClick={() => setRecv((r) => ({ ...r, [l.id]: String(l.quantity) }))}
                          title={t("supplierOrders.markReceived")}
                        >
                          <Check className="me-1 h-4 w-4" />
                          {t("supplierOrders.markReceived")}
                        </Button>
                        <span className="w-10 shrink-0 text-center">
                          {complete ? (
                            <Check className="mx-auto h-4 w-4 text-success" />
                          ) : tallied ? (
                            <span className="text-xs font-semibold text-destructive">
                              {t("supplierOrders.short")}
                            </span>
                          ) : null}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={onClose}>
                {t("common.cancel")}
              </Button>
              <Button onClick={onSaveTally} disabled={saveTally.isPending}>
                {saveTally.isPending ? (
                  <Loader2 className="me-1 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="me-1 h-4 w-4" />
                )}
                {t("supplierOrders.saveTally")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
