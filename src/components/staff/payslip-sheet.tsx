"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";

import { useLanguage } from "@/providers/i18n-provider";
import { Language, StaffAttendanceStatus } from "@/lib/enums";
import { formatDate, formatPKR, formatTime } from "@/lib/format";
import { shopHeaderHtml } from "@/lib/shop-header";
import type { StaffSalaryDetail } from "@/types/models";

// Inline hex colours only (no Tailwind/oklch) so this sheet is print- AND
// html2canvas-safe. Always renders on white for a clean paper look.
const C = { text: "#000", muted: "#555", border: "#dddddd", red: "#b3121b" };

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    new Date(y, m - 1, 1),
  );
}

/**
 * The printable salary slip — the single source for both Print and the PDF export
 * (captured by ref). Self-contained inline styles; renders on white. Carries the
 * same shop signboard header as the customer receipt and supplier order sheet.
 */
export const PayslipSheet = React.forwardRef<
  HTMLDivElement,
  { detail: StaffSalaryDetail; month: string }
>(function PayslipSheet({ detail, month }, ref) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const rtl = language === Language.Urdu;

  const ltr: React.CSSProperties = { direction: "ltr", display: "inline-block" };
  const line: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "7px 0",
    borderBottom: `1px solid ${C.border}`,
  };
  const muted: React.CSSProperties = { color: C.muted };

  // Present days that have a recorded in/out time — the attendance timing log.
  const timingRows = detail.attendance.filter(
    (a) => a.status === StaffAttendanceStatus.Present && (a.entry_time || a.exit_time),
  );

  return (
    <div
      ref={ref}
      dir={rtl ? "rtl" : "ltr"}
      style={{
        background: "#fff",
        color: C.text,
        padding: 24,
        width: "100%",
        minWidth: 480,
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
        {t("staff.payslip")}
      </div>

      {/* Who + which month */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 600 }}>{detail.staff.name}</div>
          {detail.staff.phone ? (
            <div style={{ ...muted, ...ltr }}>{detail.staff.phone}</div>
          ) : null}
        </div>
        <div style={{ textAlign: "end" }}>
          <div style={muted}>{t("staff.month")}</div>
          <div style={{ fontWeight: 600 }}>{monthLabel(month)}</div>
        </div>
      </div>

      {/* Breakdown */}
      <div style={line}>
        <span>{t("staff.monthlySalary")}</span>
        <span style={ltr}>{formatPKR(detail.staff.monthly_salary)}</span>
      </div>

      <div style={line}>
        <span>
          {t("staff.absenceDeduction")}{" "}
          <span style={{ ...muted, fontSize: 11 }}>
            ({detail.absentDays} × <span style={ltr}>{formatPKR(detail.perDay)}</span>)
          </span>
        </span>
        <span style={{ ...ltr, color: C.red }}>− {formatPKR(detail.absenceDeduction)}</span>
      </div>

      {/* Advances */}
      <div style={{ padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ ...muted, marginBottom: 4 }}>{t("staff.advances")}</div>
        {detail.advances.length === 0 ? (
          <div style={{ ...muted, fontSize: 12 }}>{t("staff.noAdvances")}</div>
        ) : (
          detail.advances.map((a) => (
            <div
              key={a.id}
              style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "3px 0" }}
            >
              <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                <span>
                  <span style={muted}>{t("fields.date")}: </span>
                  <span style={ltr}>{formatDate(a.advance_date)}</span>
                </span>
                {a.note ? (
                  <span style={{ display: "block" }}>
                    <span style={muted}>{t("fields.note")}: </span>
                    {a.note}
                  </span>
                ) : null}
              </span>
              <span style={{ ...ltr, color: C.red, whiteSpace: "nowrap" }}>
                − {formatPKR(a.amount)}
              </span>
            </div>
          ))
        )}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 4 }}>
          <span>{t("staff.advancesTotal")}</span>
          <span style={{ ...ltr, color: C.red }}>− {formatPKR(detail.advancesTotal)}</span>
        </div>
      </div>

      {/* Net */}
      <div style={{ ...line, borderBottom: "none", fontWeight: 700, fontSize: 15, paddingTop: 10 }}>
        <span>{detail.paid ? t("staff.net") : t("staff.suggestedNet")}</span>
        <span style={ltr}>{formatPKR(detail.netPayable)}</span>
      </div>

      {/* Attendance timing log (present days with recorded in/out times) */}
      {timingRows.length > 0 ? (
        <div style={{ marginTop: 10, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
          <div style={{ ...muted, marginBottom: 4 }}>{t("staff.attendanceTimes")}</div>
          {timingRows.map((a) => (
            <div
              key={a.date}
              style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "3px 0" }}
            >
              <span style={ltr}>{formatDate(a.date)}</span>
              <span style={{ ...ltr, ...muted }}>
                {formatTime(a.entry_time)} – {formatTime(a.exit_time)}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Paid stamp */}
      {detail.paid ? (
        <div style={{ marginTop: 10, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontWeight: 600 }}>
            <span>{t("staff.amountPaid")}</span>
            <span style={ltr}>{formatPKR(detail.amountPaid)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, ...muted }}>
            <span>{t("staff.paidOn")}</span>
            <span style={ltr}>{formatDate(detail.paidOn)}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
});
