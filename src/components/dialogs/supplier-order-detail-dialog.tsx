"use client";

import * as React from "react";
import { ClipboardCheck, Download, Loader2, Printer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { DialogKey } from "@/lib/dialog-keys";
import { useSupplierOrder, useUpdateSupplierOrderBill } from "@/hooks/use-supplier-orders";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/i18n-provider";
import { Language, SupplierOrderStatus } from "@/lib/enums";
import { formatDateTime } from "@/lib/format";
import { printElement, downloadElementPdf } from "@/lib/print-export";
import { isPdfUrl } from "@/lib/storage";
import { SupplierOrderSheet } from "@/components/supplier-orders/supplier-order-sheet";
import { ZoomableImage } from "@/components/common/zoomable-image";
import { DocumentUpload } from "@/components/common/document-upload";
import { StatusBadge, type StatusTone } from "@/components/common/status-badge";
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
  const updateBill = useUpdateSupplierOrderBill();

  const sheetRef = React.useRef<HTMLDivElement | null>(null);
  const [pdfBusy, setPdfBusy] = React.useState(false);

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
            {order ? formatDateTime(order.created_at) : t("common.loading")}
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
                  onClick={() => openDialog(DialogKey.SupplierOrderTally, { id: payload.id })}
                >
                  <ClipboardCheck className="me-1 h-4 w-4" />
                  {t("supplierOrders.tally")}
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
