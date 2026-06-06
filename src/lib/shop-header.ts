function esc(s: string): string {
  return String(s ?? "").replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] as string,
  );
}

// The shop's fixed signboard details (hardcoded).
const SHOP = {
  name: "قاسم ہارڈویئر اینڈ پینٹ",
  wholesale: "ہول سیل ڈیلرز",
  categories: "کیل، قبضہ، سپرٹ، دانہ لاخ، گلیو وغیرہ",
  phone: "0300-4594673",
  address: "فرنیچر مارکیٹ نزد شیزان فیکٹری بندر روڈ لاہور",
};

/**
 * The shop's printed header as a self-contained inline-styled HTML string (hex
 * colours only — print- and html2canvas-safe; NO Tailwind/oklch). Recreates the
 * shop's signboard: blue banner, name in red (white-outlined), a red categories
 * box, the phone, and an address strip. Hardcoded; shared by the supplier order
 * sheet AND the customer receipt so both carry the same header.
 */
export function shopHeaderHtml(): string {
  const BLUE = "#2766ad";
  const RED = "#b3121b";
  const outline =
    "text-shadow:-1px -1px 0 #fff,1px -1px 0 #fff,-1px 1px 0 #fff,1px 1px 0 #fff,0 0 2px #fff;";

  return `<div dir="rtl" style="border:2px solid ${BLUE};border-radius:8px;overflow:hidden;margin-bottom:14px;font-family:var(--font-urdu),'Noto Nastaliq Urdu',-apple-system,Segoe UI,Roboto,sans-serif;">
  <div style="background:${BLUE};padding:12px 14px;">
    <div style="display:flex;align-items:flex-start;gap:10px;">
      <div style="flex:1;min-width:0;">
        <div style="font-size:22px;font-weight:800;line-height:1.3;color:${RED};${outline}text-align:start;">${esc(SHOP.name)}</div>
        <div style="font-size:17px;font-weight:800;color:#ffffff;letter-spacing:1px;direction:ltr;text-align:center;margin-top:6px;">${esc(SHOP.phone)}</div>
      </div>
      <div style="width:34%;max-width:210px;background:#ffffff;border:1px solid ${RED};border-radius:5px;padding:6px 7px;color:${RED};text-align:center;">
        <div style="font-size:10px;font-weight:800;line-height:1.9;">${esc(SHOP.wholesale)}</div>
        <div style="font-size:10px;font-weight:700;line-height:1.9;margin-top:4px;">${esc(SHOP.categories)}</div>
      </div>
    </div>
  </div>
  <div style="text-align:center;font-size:11px;line-height:2;color:#000000;padding:8px 10px 12px;background:#ffffff;">${esc(SHOP.address)}</div>
</div>`;
}
