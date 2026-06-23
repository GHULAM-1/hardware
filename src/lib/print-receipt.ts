import { PaymentType, Language } from "@/lib/enums";
import { displayName } from "@/lib/display";
import { formatDate, formatPKR } from "@/lib/format";
import { shopHeaderHtml } from "@/lib/shop-header";
import type { OrderReceiptView } from "@/types/models";

type Labels = {
  appName: string;
  item: string;
  qty: string;
  price: string;
  total: string;
  paymentType: string;
  amountPaid: string;
  balanceDue: string;
  dueDate: string;
  payment: string;
  unit: (u: string) => string;
};

function esc(s: string | null | undefined): string {
  return String(s ?? "").replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] as string,
  );
}

const TH = "padding:6px 4px;border-bottom:1px solid #ddd;color:#555;font-weight:600;";
const TD = "padding:6px 4px;border-bottom:1px solid #ddd;";
const ROW = "display:flex;justify-content:space-between;padding:2px 0;";

/**
 * The receipt body markup — fully inline-styled (hex colours only) so it's safe
 * to print AND to render in-app for html2canvas (PDF / share). Reused by both.
 */
export function receiptInnerHtml(receipt: OrderReceiptView, language: Language, labels: Labels): string {
  const rows = receipt.lines
    .map(
      (l) => `
      <tr>
        <td style="${TD}text-align:start">${esc(l.item ? displayName(l.item, language) : "—")}</td>
        <td style="${TD}text-align:end">${l.quantity} ${esc(labels.unit(l.unit))}</td>
        <td style="${TD}text-align:end">${esc(formatPKR(l.selling_price))}</td>
        <td style="${TD}text-align:end">${esc(formatPKR(l.quantity * l.selling_price))}</td>
      </tr>`,
    )
    .join("");

  const partial =
    receipt.payment_type !== PaymentType.Cash
      ? `
      <div style="${ROW}"><span>${esc(labels.amountPaid)}</span><span>${esc(formatPKR(receipt.amount_paid))}</span></div>
      <div style="${ROW}font-weight:600"><span>${esc(labels.balanceDue)}</span><span>${esc(formatPKR(receipt.balance_due))}</span></div>
      ${receipt.due_date ? `<div style="${ROW}"><span>${esc(labels.dueDate)}</span><span>${esc(formatDate(receipt.due_date))}</span></div>` : ""}`
      : "";

  return `
  ${shopHeaderHtml()}
  <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:12px;">
    <div><strong>${esc(receipt.order_no)}</strong><br/>${esc(formatDate(receipt.created_at))}</div>
    <div style="text-align:end">${esc(receipt.customer ? displayName(receipt.customer, language) : "—")}${
      receipt.customer?.phone ? `<br/><span dir="ltr">${esc(receipt.customer.phone)}</span>` : ""
    }</div>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:12px;">
    <thead><tr>
      <th style="${TH}text-align:start">${esc(labels.item)}</th>
      <th style="${TH}text-align:end">${esc(labels.qty)}</th>
      <th style="${TH}text-align:end">${esc(labels.price)}</th>
      <th style="${TH}text-align:end">${esc(labels.total)}</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="margin-top:12px;font-size:12px;">
    <div style="${ROW}"><span>${esc(labels.paymentType)}</span><span>${esc(labels.payment)}</span></div>
    ${partial}
    <div style="${ROW}font-weight:700;font-size:14px;border-top:1px solid #000;padding-top:6px;margin-top:4px;"><span>${esc(labels.total)}</span><span dir="ltr">${esc(formatPKR(receipt.total))}</span></div>
  </div>`;
}

/**
 * Build a self-contained receipt HTML document (inline styles only) and print it
 * in a dedicated window. Reliable across browsers and friendly to thermal/POS rolls.
 */
export function printReceipt(receipt: OrderReceiptView, language: Language, labels: Labels) {
  const rtl = language === Language.Urdu;

  const html = `<!doctype html>
<html lang="${language}" dir="${rtl ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8" />
<title>${esc(receipt.order_no)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: ${rtl ? "'Noto Nastaliq Urdu', " : ""}-apple-system, Segoe UI, Roboto, sans-serif; color: #000; margin: 0; padding: 16px; }
  @page { margin: 12mm; }
</style>
</head>
<body>${receiptInnerHtml(receipt, language, labels)}</body>
</html>`;

  // Print via a hidden iframe — no visible new tab/window; the dialog stays put.
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  if (!win) {
    document.body.removeChild(iframe);
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();

  const cleanup = () => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  };
  win.onafterprint = cleanup;

  // Give the iframe a tick to lay out, then print.
  setTimeout(() => {
    win.focus();
    win.print();
    // Fallback cleanup for browsers that don't fire onafterprint.
    setTimeout(cleanup, 2000);
  }, 250);
}
