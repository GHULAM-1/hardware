"use client";

import { Printer } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { useOrderReceipt } from "@/hooks/use-orders";
import { useLanguage } from "@/providers/i18n-provider";
import { PaymentType } from "@/lib/enums";
import { displayName } from "@/lib/display";
import { formatDate } from "@/lib/format";
import { shopHeaderHtml } from "@/lib/shop-header";
import { printReceipt } from "@/lib/print-receipt";
import { Money } from "@/components/common/money";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ReceiptPayload = { orderId: string };

export function ReceiptDialog({ payload, onClose }: DialogComponentProps<ReceiptPayload>) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { data: receipt, isLoading } = useOrderReceipt(payload.orderId);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto overflow-x-hidden sm:max-w-lg">
        <DialogTitle className="sr-only">
          {t("orders.title")} {receipt?.order_no ?? ""}
        </DialogTitle>
        {isLoading || !receipt ? (
          <p className="py-10 text-center text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <div className="min-w-0 space-y-4">
            {/* Header (shop signboard-style banner) */}
            <div className="min-w-0 overflow-hidden" dangerouslySetInnerHTML={{ __html: shopHeaderHtml() }} />
            <p className="text-center text-sm text-muted-foreground">{t("orders.title")}</p>

            <div className="flex justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="font-mono font-semibold">{receipt.order_no}</p>
                <p className="text-muted-foreground">{formatDate(receipt.created_at)}</p>
              </div>
              <div className="min-w-0 text-end">
                <p className="truncate font-medium">
                  {receipt.customer ? displayName(receipt.customer, language) : "—"}
                </p>
                {receipt.customer?.phone && (
                  <p dir="ltr" className="truncate text-muted-foreground">
                    {receipt.customer.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Lines */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("fields.item")}</TableHead>
                  <TableHead className="text-end">{t("fields.quantity")}</TableHead>
                  <TableHead className="text-end">{t("fields.sellingPrice")}</TableHead>
                  <TableHead className="text-end">{t("orders.total")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipt.lines.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell>{l.item ? displayName(l.item, language) : "—"}</TableCell>
                    <TableCell className="text-end tabular-nums">
                      {l.quantity} {t(`units.${l.unit}`)}
                    </TableCell>
                    <TableCell className="text-end">
                      <Money value={l.selling_price} />
                    </TableCell>
                    <TableCell className="text-end">
                      <Money value={l.quantity * l.selling_price} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Totals */}
            <div className="space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between font-semibold">
                <span>{t("orders.total")}</span>
                <Money value={receipt.total} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("fields.paymentType")}</span>
                <span>{t(`payment.${receipt.payment_type}`)}</span>
              </div>
              {receipt.payment_type !== PaymentType.Cash && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("fields.amountPaid")}</span>
                    <Money value={receipt.amount_paid} />
                  </div>
                  <div className="flex justify-between font-medium text-destructive">
                    <span>{t("fields.balanceDue")}</span>
                    <Money value={receipt.balance_due} />
                  </div>
                  {receipt.due_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("fields.dueDate")}</span>
                      <span>{formatDate(receipt.due_date)}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Internal note — staff-only, never printed */}
            {receipt.internal_note && (
              <div className="no-print space-y-1 rounded-lg border border-border bg-secondary/40 p-3">
                <p className="text-xs font-semibold text-muted-foreground">
                  {t("orders.internalNoteLabel")}
                </p>
                <p className="whitespace-pre-wrap text-sm">{receipt.internal_note}</p>
              </div>
            )}

            {/* Actions (hidden in print) */}
            <div className="no-print flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>
                {t("common.cancel")}
              </Button>
              <Button
                onClick={() =>
                  printReceipt(receipt, language, {
                    appName: t("app.name"),
                    item: t("fields.item"),
                    qty: t("fields.quantity"),
                    price: t("fields.sellingPrice"),
                    total: t("orders.total"),
                    paymentType: t("fields.paymentType"),
                    amountPaid: t("fields.amountPaid"),
                    balanceDue: t("fields.balanceDue"),
                    dueDate: t("fields.dueDate"),
                    payment: t(`payment.${receipt.payment_type}`),
                    unit: (u) => t(`units.${u}`),
                  })
                }
              >
                <Printer className="me-1 h-4 w-4" />
                {t("orders.print")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
