"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useSupplierOrder } from "@/hooks/use-supplier-orders";
import { SupplierOrderSheet } from "@/components/supplier-orders/supplier-order-sheet";
import { shareElementPdf } from "@/lib/share-pdf";

/**
 * Mounted on demand to share a supplier order's material-request PDF from the
 * list. Fetches the order, renders the sheet off-screen, rasterises once
 * painted, then shares (or downloads as a fallback). Self-clears.
 */
export function SupplierOrderSharePdf({ orderId, onDone }: { orderId: string; onDone: () => void }) {
  const { t } = useTranslation();
  const { data: order } = useSupplierOrder(orderId);
  const ref = React.useRef<HTMLDivElement | null>(null);
  const started = React.useRef(false);

  React.useEffect(() => {
    if (!order || started.current) return;
    started.current = true;
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(async () => {
        try {
          if (ref.current) {
            const res = await shareElementPdf(ref.current, `${order.order_no}.pdf`, {
              title: t("app.name"),
              text: order.order_no,
            });
            if (res === "downloaded") toast.success(t("toast.saved"));
          }
        } catch {
          toast.error(t("toast.error"));
        } finally {
          onDone();
        }
      }),
    );
    return () => cancelAnimationFrame(raf);
  }, [order, onDone, t]);

  if (!order) return null;
  // Clip to a 0×0 box so nothing paints on screen; html2canvas clones the inner
  // node so it still captures at full size. (left:-9999 could leak onto the page.)
  return (
    <div
      aria-hidden
      style={{ position: "fixed", top: 0, left: 0, width: 0, height: 0, overflow: "hidden", pointerEvents: "none" }}
    >
      <div style={{ width: 820 }}>
        <SupplierOrderSheet ref={ref} order={order} />
      </div>
    </div>
  );
}
