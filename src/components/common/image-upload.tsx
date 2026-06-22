"use client";

import * as React from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ZoomableImage } from "@/components/common/zoomable-image";
import { ConfirmAlert } from "@/components/common/confirm-alert";
import {
  ACCEPT_ATTR,
  removeImage,
  uploadImage,
  validateImageFile,
  type ImageFolder,
} from "@/lib/storage";

/**
 * Controlled image picker: uploads to the public `media` bucket and reports the
 * resulting public URL via onChange. Replacing or removing also deletes the
 * previously stored file (best-effort) so the bucket doesn't accumulate orphans.
 */
export function ImageUpload({
  value,
  onChange,
  folder,
  disabled,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: ImageFolder;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = React.useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;

    const problem = validateImageFile(file);
    if (problem) {
      toast.error(t(problem === "type" ? "media.invalidType" : "media.tooLarge"));
      return;
    }

    setBusy(true);
    try {
      const url = await uploadImage(folder, file);
      const previous = value;
      onChange(url);
      if (previous) void removeImage(previous);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("media.uploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  // The Trash button only opens the confirm; the actual removal (which deletes the
  // stored file) runs after the user confirms.
  function doRemove() {
    const previous = value;
    onChange(null);
    if (previous) void removeImage(previous);
  }

  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
        {value ? (
          <ZoomableImage src={value} className="h-full w-full" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImagePlus className="h-6 w-6" />
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
          accept={ACCEPT_ATTR}
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
              onClick={() => setConfirmRemoveOpen(true)}
            >
              <Trash2 className="me-1 h-4 w-4" />
              {t("media.remove")}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{t("media.hint")}</p>
      </div>

      <ConfirmAlert
        open={confirmRemoveOpen}
        onOpenChange={setConfirmRemoveOpen}
        title={t("media.removeTitle")}
        description={t("media.removeConfirm")}
        confirmLabel={t("media.remove")}
        onConfirm={doRemove}
      />
    </div>
  );
}
