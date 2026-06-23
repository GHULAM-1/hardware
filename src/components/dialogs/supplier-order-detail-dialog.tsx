"use client";

import * as React from "react";
import { Check, Download, Loader2, Pencil, Printer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { DialogKey } from "@/lib/dialog-keys";
import {
  useSupplierOrder,
  useSaveSupplierOrderTally,
  useUpdateSupplierOrderBill,
} from "@/hooks/use-supplier-orders";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/i18n-provider";
import { Language, SupplierOrderStatus } from "@/lib/enums";
import { displayName } from "@/lib/display";
import { formatDate } from "@/lib/format";
import { printElement, downloadElementPdf } from "@/lib/print-export";
import { isPdfUrl } from "@/lib/storage";
import { SupplierOrderSheet } from "@/components/supplier-orders/supplier-order-sheet";
import { ZoomableImage } from "@/components/common/zoomable-image";
import { DocumentUpload } from "@/components/common/document-upload";
import { StatusBadge, type StatusTone } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SupplierOrderLineView } from "@/types/models";

export type SupplierOrderDetailPayload = { id: string };

const STATUS_TONE: Record<string, StatusTone> = {
  [SupplierOrderStatus.Pending]: "warning",
  [SupplierOrderStatus.Partial]: "info",
  [SupplierOrderStatus.Received]: "success",
};
const STATUS_LABEL: Record<string, string> = {
  [SupplierOrderStatus.Pending]: "supplierOrders.pending",
  [SupplierOrderStatus.Partial]: "supplierOrders.partial",
  [SupplierOrderStatus.Received]: "supplierOrders.received",
};

export function SupplierOrderDetailDialog({
  payload,
  onClose,
}: DialogComponentProps<SupplierOrderDetailPayload>) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { openDialog } = useDialogManager();
  const isSuperAdmin = useIsSuperAdmin();
  const { data: order, isLoading } = useSupplierOrder(payload.id);
  const saveTally = useSaveSupplierOrderTally();
  const updateBill = useUpdateSupplierOrderBill();

  const sheetRef = React.useRef<HTMLDivElement | null>(null);
  const [pdfBusy, setPdfBusy] = React.useState(false);

  // Per-line received-quantity inputs ("" = not tallied yet). Seeded from the
  // saved order and re-seeded whenever it changes (e.g. after a tally save
  // refetches) — done during render via a seed key, not an effect, so local
  // edits aren't clobbered while the underlying order is unchanged.
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

  // Lines grouped by their supplier (one item ↔ one supplier).
  const groups = React.useMemo(() => {
    const m = new Map<string, { name: string | null; lines: SupplierOrderLineView[] }>();
    for (const l of order?.lines ?? []) {
      const key = l.supplier?.id ?? "__none__";
      if (!m.has(key)) m.set(key, { name: l.supplier?.name ?? null, lines: [] });
      m.get(key)!.lines.push(l);
    }
    return Array.from(m.values());
  }, [order]);

  async function onDownloadPdf() {
    if (!sheetRef.current || !order) return;
    setPdfBusy(true);
    try {
      await downloadElementPdf(sheetRef.current, `${order.order_no}.pdf`);
    } catch {
      toast.error(t("supplierOrders.pdfFailed"));
    } finally {
      setPdfBusy(false);
    }
  }

  function onPrint() {
    if (!sheetRef.current || !order) return;
    printElement(sheetRef.current, { title: order.order_no, rtl: language === Language.Urdu });
  }

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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.error"));
    }
  }

  async function onBillChange(url: string | null) {
    try {
      await updateBill.mutateAsync({ id: payload.id, value: url });
      toast.success(t("toast.saved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.error"));
    }
  }

  const status = order?.status ?? SupplierOrderStatus.Pending;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto overflow-x-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 pe-6">
            <span className="font-mono">{order?.order_no ?? t("supplierOrders.detail")}</span>
            {order && <StatusBadge tone={STATUS_TONE[status]} label={t(STATUS_LABEL[status])} />}
          </DialogTitle>
          <DialogDescription>
            {order ? formatDate(order.created_at) : t("common.loading")}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !order ? (
          <p className="py-10 text-center text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <div className="min-w-0 space-y-4">
            {/* Printable sheet (also captured for the PDF). Fixed document width, so
                on small screens the preview scrolls horizontally rather than
                squishing the columns. min-w-0 keeps that scroll INSIDE this box. */}
            <div className="min-w-0 overflow-x-auto rounded-lg border border-border">
              <SupplierOrderSheet ref={sheetRef} order={order} />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap justify-end gap-2">
              {isSuperAdmin && (
                <Button
                  variant="outline"
                  onClick={() => openDialog(DialogKey.SupplierOrderForm, { id: payload.id })}
                >
                  <Pencil className="me-1 h-4 w-4" />
                  {t("common.edit")}
                </Button>
              )}
              <Button variant="outline" onClick={onPrint}>
                <Printer className="me-1 h-4 w-4" />
                {t("supplierOrders.print")}
              </Button>
              <Button onClick={onDownloadPdf} disabled={pdfBusy}>
                {pdfBusy ? (
                  <Loader2 className="me-1 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="me-1 h-4 w-4" />
                )}
                {t("supplierOrders.downloadPdf")}
              </Button>
            </div>

            {/* Tally — mark what actually arrived, per item, grouped by supplier. */}
            {isSuperAdmin && (
              <div className="space-y-4 rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="text-base font-semibold">{t("supplierOrders.tally")}</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={markAllReceived}>
                    <Check className="me-1 h-4 w-4" />
                    {t("supplierOrders.markAllReceived")}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t("supplierOrders.manualStockHint")}</p>

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
                            {/* Per-row shortcut: fills the ordered quantity so the user
                                doesn't have to retype it when it all arrived. */}
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

                <Button onClick={onSaveTally} disabled={saveTally.isPending} className="w-full sm:w-auto">
                  {saveTally.isPending ? (
                    <Loader2 className="me-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="me-1 h-4 w-4" />
                  )}
                  {t("supplierOrders.saveTally")}
                </Button>
              </div>
            )}

            {/* Supplier's bill (image/PDF) — attach / replace / remove anytime. */}
            {isSuperAdmin && (
              <div className="space-y-3 rounded-lg border border-border bg-card p-4">
                <Label>{order.bill_url ? t("supplierOrders.replaceBill") : t("supplierOrders.attachBill")}</Label>
                {order.bill_url &&
                  (isPdfUrl(order.bill_url) ? (
                    <iframe
                      src={order.bill_url}
                      title={t("supplierOrders.viewBill")}
                      className="h-72 w-full rounded-md border border-border bg-background"
                    />
                  ) : (
                    <div className="h-72 overflow-hidden rounded-md border border-border bg-background">
                      <ZoomableImage src={order.bill_url} fit="contain" className="h-full w-full" />
                    </div>
                  ))}
                <DocumentUpload
                  value={order.bill_url}
                  onChange={onBillChange}
                  disabled={updateBill.isPending}
                />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
