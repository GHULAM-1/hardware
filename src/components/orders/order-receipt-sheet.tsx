"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";

import { useLanguage } from "@/providers/i18n-provider";
import { Language } from "@/lib/enums";
import { receiptInnerHtml } from "@/lib/print-receipt";
import type { OrderReceiptView } from "@/types/models";

/**
 * The customer receipt rendered as an html2canvas-safe sheet (inline-hex styles,
 * in-app so the Urdu font is loaded) — the source for the PDF/share path. The
 * on-screen receipt-dialog body stays Tailwind-styled; this is for rasterising.
 */
export const OrderReceiptSheet = React.forwardRef<HTMLDivElement, { receipt: OrderReceiptView }>(
  function OrderReceiptSheet({ receipt }, ref) {
    const { t } = useTranslation();
    const { language } = useLanguage();
    const rtl = language === Language.Urdu;

    const html = receiptInnerHtml(receipt, language, {
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
    });

    return (
      <div
        ref={ref}
        dir={rtl ? "rtl" : "ltr"}
        style={{
          width: 520,
          background: "#ffffff",
          color: "#000000",
          padding: 16,
          fontFamily: rtl
            ? "var(--font-urdu), 'Noto Nastaliq Urdu', sans-serif"
            : "-apple-system, Segoe UI, Roboto, sans-serif",
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  },
);
