"use client";

import * as React from "react";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ZoomableImage } from "@/components/common/zoomable-image";
import {
  ACCEPT_DOCUMENT_ATTR,
  isPdfUrl,
  removeImage,
  uploadImage,
  validateDocumentFile,
} from "@/lib/storage";

/**
 * Controlled file picker for a single document (image OR PDF) — used to attach a
 * supplier's bill. Mirrors ImageUpload but allows PDFs (shown with a file icon).
 * Uploads to the public `media` bucket and reports the public URL via onChange.
 */
export function DocumentUpload({
  value,
  onChange,
  disabled,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const problem = validateDocumentFile(file);
    if (problem) {
      toast.error(t(problem === "type" ? "media.invalidDocType" : "media.documentTooLarge"));
      return;
    }

    setBusy(true);
    try {
      const url = await uploadImage("supplier_bill", file);
      const previous = value;
      onChange(url);
      if (previous) void removeImage(previous);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("media.uploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  function onRemove() {
    const previous = value;
    onChange(null);
    if (previous) void removeImage(previous);
  }

  const pdf = value ? isPdfUrl(value) : false;

  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
        {value ? (
          pdf ? (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-full w-full items-center justify-center text-muted-foreground hover:text-foreground"
              title={t("media.viewImage")}
            >
              <FileText className="h-7 w-7" />
            </a>
          ) : (
            <ZoomableImage src={value} className="h-full w-full" />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Upload className="h-6 w-6" />
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col items-start gap-1.5">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_DOCUMENT_ATTR}
          className="hidden"
          onChange={onPick}
          disabled={disabled || busy}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
          >
            {value ? t("media.replace") : t("media.upload")}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={disabled || busy}
              onClick={onRemove}
            >
              <Trash2 className="me-1 h-4 w-4" />
              {t("media.remove")}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{t("media.docHint")}</p>
      </div>
    </div>
  );
}
