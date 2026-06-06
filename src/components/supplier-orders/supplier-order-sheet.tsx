"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";

import { useLanguage } from "@/providers/i18n-provider";
import { Language } from "@/lib/enums";
import { displayName } from "@/lib/display";
import { formatDate } from "@/lib/format";
import { shopHeaderHtml } from "@/lib/shop-header";
import type { SupplierOrderDetailView } from "@/types/models";

// Inline hex colours only (no Tailwind/oklch) so this sheet is print- AND
// html2canvas-safe. It always renders on white for a clean paper look.
const C = { text: "#000", muted: "#555", border: "#dddddd", line: "#000" };

/**
 * The printable "material list" sheet — the single source for both Print and the
 * PDF export (captured by ref). Self-contained inline styles; renders on white.
 */
export const SupplierOrderSheet = React.forwardRef<
  HTMLDivElement,
  { order: SupplierOrderDetailView }
>(function SupplierOrderSheet({ order }, ref) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const rtl = language === Language.Urdu;

  const cellBorder = `1px solid ${C.border}`;
  const th: React.CSSProperties = {
    borderBottom: cellBorder,
    padding: "8px 12px",
    color: C.muted,
    fontWeight: 600,
    verticalAlign: "bottom",
  };
  const td: React.CSSProperties = {
    borderBottom: cellBorder,
    padding: "8px 12px",
    verticalAlign: "top",
  };
  // Long notes must wrap, not collide with the quantity column.
  const noteCell: React.CSSProperties = {
    ...td,
    color: C.muted,
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  };

  return (
    <div
      ref={ref}
      dir={rtl ? "rtl" : "ltr"}
      style={{
        background: "#fff",
        color: C.text,
        padding: 24,
        width: "100%",
        // A sane document width so the columns never crush together; the dialog
        // preview scrolls horizontally on small screens instead of squishing it.
        minWidth: 560,
        fontSize: 13,
        lineHeight: 1.5,
        fontFamily: rtl
          ? "var(--font-urdu), -apple-system, Segoe UI, Roboto, sans-serif"
          : "-apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      {/* Shop header (signboard-style banner) */}
      <div dangerouslySetInnerHTML={{ __html: shopHeaderHtml() }} />

      <div style={{ textAlign: "center", fontWeight: 600, marginBottom: 10 }}>
        {t("supplierOrders.materialList")}
      </div>

      {/* Meta */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 12, gap: 12 }}>
        <div>
          <div style={{ fontWeight: 600 }}>{order.order_no}</div>
          <div style={{ color: C.muted }}>{formatDate(order.created_at)}</div>
        </div>
        <div style={{ textAlign: "end" }}>
          <div style={{ color: C.muted }}>{t("fields.supplier")}</div>
          <div style={{ fontWeight: 600 }}>{order.supplier?.name ?? "—"}</div>
          {order.supplier?.phone ? (
            <div style={{ color: C.muted, direction: "ltr" }}>{order.supplier.phone}</div>
          ) : null}
        </div>
      </div>

      {/* Items */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: 32 }} />
          <col style={{ width: "38%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "30%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ ...th, textAlign: "start" }}>#</th>
            <th style={{ ...th, textAlign: "start" }}>{t("fields.item")}</th>
            <th style={{ ...th, textAlign: "start" }}>{t("fields.quantity")}</th>
            <th style={{ ...th, textAlign: "start" }}>{t("fields.note")}</th>
          </tr>
        </thead>
        <tbody>
          {order.lines.map((l, i) => (
            <tr key={i}>
              <td style={td}>{i + 1}</td>
              <td style={{ ...td, wordBreak: "break-word", overflowWrap: "anywhere" }}>
                {l.item ? displayName(l.item, language) : "—"}
              </td>
              <td style={{ ...td, overflowWrap: "anywhere" }}>
                {l.quantity} {t(`units.${l.unit}`)}
              </td>
              <td style={noteCell}>{l.note ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {order.note ? (
        <div style={{ marginTop: 12, fontSize: 12, wordBreak: "break-word", overflowWrap: "anywhere" }}>
          <span style={{ color: C.muted }}>{t("supplierOrders.orderNote")}: </span>
          {order.note}
        </div>
      ) : null}
    </div>
  );
});
