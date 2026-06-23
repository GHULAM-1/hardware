"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";

import { useLanguage } from "@/providers/i18n-provider";
import { Language } from "@/lib/enums";
import { displayName } from "@/lib/display";
import { formatDate } from "@/lib/format";
import { shopHeaderHtml } from "@/lib/shop-header";
import type { SupplierOrderDetailView, SupplierOrderLineView } from "@/types/models";

// Inline hex colours only (no Tailwind/oklch) so this sheet is print- AND
// html2canvas-safe. It always renders on white for a clean paper look.
const C = { text: "#000", muted: "#555", border: "#dddddd", line: "#000" };

/**
 * The printable "material list" sheet — the single source for both Print and the
 * PDF export (captured by ref). Self-contained inline styles; renders on white.
 * Lines are grouped by their supplier (one item ↔ one supplier), and each line
 * shows ordered vs received so the sheet doubles as a hand tally.
 */
export const SupplierOrderSheet = React.forwardRef<
  HTMLDivElement,
  { order: SupplierOrderDetailView }
>(function SupplierOrderSheet({ order }, ref) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const rtl = language === Language.Urdu;

  // Group lines by supplier, preserving first-seen order.
  const groups = React.useMemo(() => {
    const m = new Map<string, { name: string | null; lines: SupplierOrderLineView[] }>();
    for (const l of order.lines) {
      const key = l.supplier?.id ?? "__none__";
      if (!m.has(key)) m.set(key, { name: l.supplier?.name ?? null, lines: [] });
      m.get(key)!.lines.push(l);
    }
    return Array.from(m.values());
  }, [order.lines]);

  const cellBorder = `1px solid ${C.border}`;
  const th: React.CSSProperties = {
    borderBottom: cellBorder,
    padding: "6px 10px",
    color: C.muted,
    fontWeight: 600,
    verticalAlign: "bottom",
    textAlign: "start",
  };
  const td: React.CSSProperties = {
    borderBottom: cellBorder,
    padding: "6px 10px",
    verticalAlign: "top",
  };
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
        <div style={{ fontWeight: 600 }}>{order.order_no}</div>
        <div style={{ color: C.muted }}>{formatDate(order.created_at)}</div>
      </div>

      {/* One table per supplier */}
      {groups.map((g, gi) => (
        <div key={gi} style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            {g.name ?? t("supplierOrders.noSupplier")}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: 28 }} />
              <col style={{ width: "34%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "28%" }} />
            </colgroup>
            <thead>
              <tr>
                <th style={th}>#</th>
                <th style={th}>{t("fields.item")}</th>
                <th style={th}>{t("supplierOrders.ordered")}</th>
                <th style={th}>{t("supplierOrders.received")}</th>
                <th style={th}>{t("fields.note")}</th>
              </tr>
            </thead>
            <tbody>
              {g.lines.map((l, i) => (
                <tr key={l.id}>
                  <td style={td}>{i + 1}</td>
                  <td style={{ ...td, wordBreak: "break-word", overflowWrap: "anywhere" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {l.item?.image_url ? (
                        // Plain <img> on purpose: this sheet is captured by html2canvas /
                        // printed as raw HTML, where next/image can't render.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={l.item.image_url}
                          crossOrigin="anonymous"
                          alt=""
                          style={{
                            width: 30,
                            height: 30,
                            flexShrink: 0,
                            objectFit: "cover",
                            borderRadius: 4,
                            border: `1px solid ${C.border}`,
                          }}
                        />
                      ) : null}
                      <span>{l.item ? displayName(l.item, language) : "—"}</span>
                    </div>
                  </td>
                  <td style={{ ...td, overflowWrap: "anywhere" }}>
                    {l.quantity} {t(`units.${l.unit}`)}
                  </td>
                  <td style={{ ...td, overflowWrap: "anywhere" }}>
                    {l.received_quantity == null
                      ? ""
                      : `${l.received_quantity} ${t(`units.${l.unit}`)}`}
                  </td>
                  <td style={noteCell}>{l.note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {order.note ? (
        <div style={{ marginTop: 4, fontSize: 12, wordBreak: "break-word", overflowWrap: "anywhere" }}>
          <span style={{ color: C.muted }}>{t("supplierOrders.orderNote")}: </span>
          {order.note}
        </div>
      ) : null}
    </div>
  );
});
