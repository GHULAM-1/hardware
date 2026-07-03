"use client";

import { useTranslation } from "react-i18next";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { useOrderReceipt } from "@/hooks/use-orders";
import { formatDateTime } from "@/lib/format";
import { paymentMeta } from "@/lib/status-meta";
import { StatusBadge } from "@/components/common/status-badge";
import { OrderDetailBody } from "@/components/details/order-detail-body";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type OrderDetailPayload = { orderId: string };

/**
 * Read-only order view opened by clicking an order row. Shows the line items,
 * totals, and — unlike the customer-facing receipt — the staff-only internal
 * note. Printing stays explicit via the "Print receipt" button.
 */
export function OrderDetailDialog({ payload, onClose }: DialogComponentProps<OrderDetailPayload>) {
  const { t } = useTranslation();
  const { data: order } = useOrderReceipt(payload.orderId);

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

        <OrderDetailBody orderId={payload.orderId} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
