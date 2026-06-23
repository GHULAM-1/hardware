"use client";

import { Receipt } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { DialogKey } from "@/lib/dialog-keys";
import { useOrderReceipt } from "@/hooks/use-orders";
import { useLanguage } from "@/providers/i18n-provider";
import { PaymentType } from "@/lib/enums";
import { displayName } from "@/lib/display";
import { formatDate, formatDateTime } from "@/lib/format";
import { paymentMeta } from "@/lib/status-meta";
import { Money } from "@/components/common/money";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type OrderDetailPayload = { orderId: string };

/**
 * Read-only order view opened by clicking an order row. Shows the line items,
 * totals, and — unlike the customer-facing receipt — the staff-only internal
 * note. Printing stays explicit via the "Print receipt" button.
 */
export function OrderDetailDialog({ payload, onClose }: DialogComponentProps<OrderDetailPayload>) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { openDialog } = useDialogManager();
  const { data: order, isLoading } = useOrderReceipt(payload.orderId);

  const m = order ? paymentMeta(order.payment_type) : null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto overflow-x-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 pe-6">
            <span className="font-mono">{order?.order_no ?? t("orders.title")}</span>
            {order && m && <StatusBadge tone={m.tone} label={t(m.labelKey)} />}
          </DialogTitle>
          <DialogDescription>
            {order ? formatDateTime(order.created_at) : t("common.loading")}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !order ? (
          <p className="py-10 text-center text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <div className="min-w-0 space-y-4">
            {/* Customer */}
            <div className="text-sm">
              <span className="font-medium">
                {order.customer ? displayName(order.customer, language) : "—"}
              </span>
              {order.customer?.phone && (
                <span dir="ltr" className="ms-2 text-muted-foreground">
                  {order.customer.phone}
                </span>
              )}
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
                {order.lines.map((l, i) => (
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
                <Money value={order.total} />
              </div>
              {order.payment_type !== PaymentType.Cash && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("fields.amountPaid")}</span>
                    <Money value={order.amount_paid} />
                  </div>
                  <div className="flex justify-between font-medium text-destructive">
                    <span>{t("fields.balanceDue")}</span>
                    <Money value={order.balance_due} />
                  </div>
                  {order.due_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("fields.dueDate")}</span>
                      <span>{formatDate(order.due_date)}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Internal note (staff-only) */}
            {order.internal_note && (
              <div className="space-y-1 rounded-lg border border-border bg-secondary/40 p-3">
                <p className="text-xs font-semibold text-muted-foreground">
                  {t("orders.internalNoteLabel")}
                </p>
                <p className="whitespace-pre-wrap break-words text-sm">{order.internal_note}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={onClose}>
                {t("common.cancel")}
              </Button>
              <Button onClick={() => openDialog(DialogKey.Receipt, { orderId: order.id })}>
                <Receipt className="me-1 h-4 w-4" />
                {t("orders.print")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
