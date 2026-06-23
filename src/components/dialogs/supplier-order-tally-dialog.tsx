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
          <DialogTitle className="pe-6">{t("supplierOrders.tally")}</DialogTitle>
          <DialogDescription>{t("supplierOrders.manualStockHint")}</DialogDescription>
        </DialogHeader>

        {isLoading || !order ? (
          <p className="py-10 text-center text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <div className="min-w-0 space-y-4">
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={markAllReceived}>
                <Check className="me-1 h-4 w-4" />
                {t("supplierOrders.markAllReceived")}
              </Button>
            </div>
            {groups.map((g, gi) => (
              <div key={gi} className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  {g.name ?? t("supplierOrders.noSupplier")}
                </div>
                {g.lines.map((l) => {
                  const v = recv[l.id] ?? "";
                  const tallied = v !== "";
                  const complete = tallied && Number(v) >= Number(l.quantity);
                  const short = tallied && !complete;
                  return (
                    <div
                      key={l.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-border bg-background p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">
                          {l.item ? displayName(l.item, language) : "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t("supplierOrders.ordered")}: {l.quantity} {t(`units.${l.unit}`)}
                          {short && (
                            <span className="ms-2 font-semibold text-destructive">
                              {t("supplierOrders.short")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          dir="ltr"
                          className="w-20"
                          value={v}
                          placeholder="0"
                          aria-label={t("supplierOrders.received")}
                          onChange={(e) =>
                            setRecv((r) => ({ ...r, [l.id]: e.target.value.replace(/\D/g, "") }))
                          }
                        />
                        <span className="w-16 text-xs text-muted-foreground sm:w-24">
                          {t(`units.${l.unit}`)}
                        </span>
                      </div>
                      {/* Full-width on mobile (wraps below), inline on desktop. Green = received. */}
                      <Button
                        type="button"
                        size="sm"
                        variant={complete ? "success" : "outline"}
                        className="basis-full justify-center sm:w-44 sm:basis-auto"
                        onClick={() => setRecv((r) => ({ ...r, [l.id]: String(l.quantity) }))}
                      >
                        <Check className="me-1 h-4 w-4" />
                        {t("supplierOrders.markReceived")}
                      </Button>
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
