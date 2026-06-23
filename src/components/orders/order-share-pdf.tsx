"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useOrderReceipt } from "@/hooks/use-orders";
import { OrderReceiptSheet } from "@/components/orders/order-receipt-sheet";
import { shareElementPdf } from "@/lib/share-pdf";

/**
 * Mounted on demand to share an order's receipt PDF from the list (no dialog).
 * Fetches the receipt, renders it off-screen, rasterises once painted, then
 * hands the PDF to the share sheet (or downloads as a fallback). Self-clears.
 */
export function OrderSharePdf({ orderId, onDone }: { orderId: string; onDone: () => void }) {
  const { t } = useTranslation();
  const { data: receipt } = useOrderReceipt(orderId);
  const ref = React.useRef<HTMLDivElement | null>(null);
  const started = React.useRef(false);

  React.useEffect(() => {
    if (!receipt || started.current) return;
    started.current = true;
    // Two frames so the off-screen sheet is fully painted before we rasterise.
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(async () => {
        try {
          if (ref.current) {
            const res = await shareElementPdf(ref.current, `${receipt.order_no}.pdf`, {
              title: t("app.name"),
              text: receipt.order_no,
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
  }, [receipt, onDone, t]);

  if (!receipt) return null;
  // Clip to a 0×0 box so nothing paints on screen; html2canvas clones the inner
  // node so it still captures at full size. (left:-9999 could leak onto the page.)
  return (
    <div
      aria-hidden
      style={{ position: "fixed", top: 0, left: 0, width: 0, height: 0, overflow: "hidden", pointerEvents: "none" }}
    >
      <OrderReceiptSheet ref={ref} receipt={receipt} />
    </div>
  );
}
