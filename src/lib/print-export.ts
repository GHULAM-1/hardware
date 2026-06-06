/**
 * Generic "print this DOM node" + "download this DOM node as PDF" helpers.
 *
 * The target node is expected to be self-contained with INLINE styles (so print
 * works without the app stylesheet, and html2canvas only meets safe rgb/hex
 * colours — never Tailwind's oklch tokens, which its parser rejects).
 */

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] as string,
  );
}

/** Print a node via a hidden iframe — no visible tab; the dialog stays put. */
export function printElement(node: HTMLElement, opts: { title: string; rtl: boolean }) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  if (!win) {
    document.body.removeChild(iframe);
    return;
  }

  const html = `<!doctype html>
<html lang="${opts.rtl ? "ur" : "en"}" dir="${opts.rtl ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(opts.title)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 16px; color: #000; background: #fff;
    font-family: ${opts.rtl ? "'Noto Nastaliq Urdu', " : ""}-apple-system, Segoe UI, Roboto, sans-serif; }
  @page { margin: 12mm; }
</style>
</head>
<body>${node.innerHTML}</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();

  const cleanup = () => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  };
  win.onafterprint = cleanup;

  setTimeout(() => {
    win.focus();
    win.print();
    setTimeout(cleanup, 2000);
  }, 300);
}

/** Rasterise a node and save it as an A4 PDF (paginated if tall). Urdu-safe. */
export async function downloadElementPdf(node: HTMLElement, filename: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(node, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
  });

  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;
  const img = canvas.toDataURL("image/jpeg", 0.95);

  if (imgH <= pageH) {
    pdf.addImage(img, "JPEG", 0, 0, imgW, imgH);
  } else {
    let remaining = imgH;
    let position = 0;
    while (remaining > 0) {
      pdf.addImage(img, "JPEG", 0, position, imgW, imgH);
      remaining -= pageH;
      position -= pageH;
      if (remaining > 0) pdf.addPage();
    }
  }

  pdf.save(filename);
}
