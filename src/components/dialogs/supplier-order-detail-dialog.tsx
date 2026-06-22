"use client";

import * as React from "react";
import { Check, Download, Loader2, Printer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import {
  useSupplierOrder,
  useMarkSupplierOrderReceived,
  useUpdateSupplierOrderBill,
} from "@/hooks/use-supplier-orders";
import { ConfirmAlert } from "@/components/common/confirm-alert";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/i18n-provider";
import { Language, SupplierOrderStatus } from "@/lib/enums";
import { formatDate } from "@/lib/format";
import { printElement, downloadElementPdf } from "@/lib/print-export";
import { isPdfUrl } from "@/lib/storage";
import { SupplierOrderSheet } from "@/components/supplier-orders/supplier-order-sheet";
import { ZoomableImage } from "@/components/common/zoomable-image";
import { DocumentUpload } from "@/components/common/document-upload";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type SupplierOrderDetailPayload = { id: string };

export function SupplierOrderDetailDialog({
  payload,
  onClose,
}: DialogComponentProps<SupplierOrderDetailPayload>) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isSuperAdmin = useIsSuperAdmin();
  const { data: order, isLoading } = useSupplierOrder(payload.id);
  const markReceived = useMarkSupplierOrderReceived();
  const updateBill = useUpdateSupplierOrderBill();
  const [confirmReceiveOpen, setConfirmReceiveOpen] = React.useState(false);

  const sheetRef = React.useRef<HTMLDivElement | null>(null);
  const [billUrl, setBillUrl] = React.useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = React.useState(false);

  const received = order?.status === SupplierOrderStatus.Received;

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

  async function onMarkReceived() {
    try {
      await markReceived.mutateAsync({ id: payload.id, values: { bill_url: billUrl } });
      toast.success(t("supplierOrders.markedReceived"));
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

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto overflow-x-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 pe-6">
            <span className="font-mono">{order?.order_no ?? t("supplierOrders.detail")}</span>
            {order && (
              <StatusBadge
                tone={received ? "success" : "warning"}
                label={t(received ? "supplierOrders.received" : "supplierOrders.pending")}
              />
            )}
          </DialogTitle>
          <DialogDescription>
            {order ? formatDate(order.created_at) : t("common.loading")}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !order ? (
          <p className="py-10 text-center text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <div className="min-w-0 space-y-4">
            {/* Printable sheet (also captured for the PDF). It has a fixed document
                width, so on small screens the preview scrolls horizontally rather
                than squishing the columns. min-w-0 keeps that scroll INSIDE this
                box so it never widens the dialog. */}
            <div className="min-w-0 overflow-x-auto rounded-lg border border-border">
              <SupplierOrderSheet ref={sheetRef} order={order} />
            </div>

            {/* Output actions */}
            <div className="flex flex-wrap justify-end gap-2">
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

            {/* Receive / bill */}
            {received ? (
              <div className="space-y-3 rounded-lg border border-border bg-card p-4 text-sm">
                <div className="flex items-center gap-2 text-success">
                  <Check className="h-4 w-4" />
                  <span className="font-medium">
                    {t("supplierOrders.receivedOn", {
                      date: order.received_at ? formatDate(order.received_at) : "—",
                    })}
                  </span>
                </div>

                {/* View the attached bill inline (image or PDF). */}
                {order.bill_url && (
                  <div className="space-y-2">
                    {isPdfUrl(order.bill_url) ? (
                      <iframe
                        src={order.bill_url}
                        title={t("supplierOrders.viewBill")}
                        className="h-72 w-full rounded-md border border-border bg-background"
                      />
                    ) : (
                      <div className="h-72 overflow-hidden rounded-md border border-border bg-background">
                        <ZoomableImage src={order.bill_url} fit="contain" className="h-full w-full" />
                      </div>
                    )}
                  </div>
                )}

                {/* Add / replace / remove the bill even after it's received. */}
                {isSuperAdmin && (
                  <div className="space-y-2 border-t border-border pt-3">
                    <Label>{order.bill_url ? t("supplierOrders.replaceBill") : t("supplierOrders.attachBill")}</Label>
                    <DocumentUpload
                      value={order.bill_url}
                      onChange={onBillChange}
                      disabled={updateBill.isPending}
                    />
                  </div>
                )}
              </div>
            ) : isSuperAdmin ? (
              <div className="space-y-3 rounded-lg border border-border bg-card p-4">
                <Label>
                  {t("supplierOrders.attachBill")}
                  <span className="ms-1 text-muted-foreground">({t("common.optional")})</span>
                </Label>
                <DocumentUpload value={billUrl} onChange={setBillUrl} disabled={markReceived.isPending} />
                <Button onClick={() => setConfirmReceiveOpen(true)} disabled={markReceived.isPending} className="w-full sm:w-auto">
                  {markReceived.isPending ? (
                    <Loader2 className="me-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="me-1 h-4 w-4" />
                  )}
                  {t("supplierOrders.markReceived")}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>

      <ConfirmAlert
        open={confirmReceiveOpen}
        onOpenChange={setConfirmReceiveOpen}
        title={t("supplierOrders.markReceivedTitle")}
        description={t("supplierOrders.markReceivedConfirm")}
        confirmLabel={t("supplierOrders.markReceived")}
        destructive={false}
        onConfirm={onMarkReceived}
      />
    </Dialog>
  );
}
