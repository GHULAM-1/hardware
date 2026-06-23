import { pdfBlobFromElement } from "@/lib/print-export";

/**
 * Hand a PDF blob to the device's native share sheet (Web Share API with files).
 * Where file-sharing isn't supported — most desktops, or when the user-gesture
 * has expired — it falls back to downloading the PDF. Never throws.
 *
 * Returns "shared" | "downloaded" | "cancelled" so callers can toast accordingly.
 */
export async function sharePdf(
  blob: Blob,
  filename: string,
  meta: { title: string; text?: string },
): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = new File([blob], filename, { type: "application/pdf" });

  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  if (nav?.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: meta.title, text: meta.text });
      return "shared";
    } catch (err) {
      // User dismissed the share sheet — not an error, and don't also download.
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
      // Anything else (gesture expired, unsupported) → fall through to download.
    }
  }

  downloadBlob(blob, filename);
  return "downloaded";
}

/** Rasterise a rendered node to a PDF blob and share it. */
export async function shareElementPdf(
  node: HTMLElement,
  filename: string,
  meta: { title: string; text?: string },
): Promise<"shared" | "downloaded" | "cancelled"> {
  const blob = await pdfBlobFromElement(node);
  return sharePdf(blob, filename, meta);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
