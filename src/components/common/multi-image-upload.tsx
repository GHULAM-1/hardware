"use client";

import * as React from "react";
import { ImagePlus, Loader2, Star, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ZoomableImage } from "@/components/common/zoomable-image";
import { cn } from "@/lib/utils";
import {
  ACCEPT_ATTR,
  removeImage,
  uploadImage,
  validateImageFile,
  type ImageFolder,
} from "@/lib/storage";

/**
 * Controlled multi-image (gallery) picker. Uploads each chosen file to the public
 * `media` bucket and reports the list of public URLs via onChange. The FIRST image
 * is the primary thumbnail shown in lists. Removing an image also deletes the stored
 * file (best-effort) so the bucket doesn't accumulate orphans. Mirrors ImageUpload
 * but for an array — used for products (Pricing / Warehouse).
 */
export function MultiImageUpload({
  value,
  onChange,
  folder,
  disabled,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  folder: ImageFolder;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-picking the same file(s)
    if (!files.length) return;

    setBusy(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const problem = validateImageFile(file);
        if (problem) {
          toast.error(t(problem === "type" ? "media.invalidType" : "media.tooLarge"));
          continue;
        }
        uploaded.push(await uploadImage(folder, file));
      }
      if (uploaded.length) onChange([...value, ...uploaded]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("media.uploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  function removeAt(index: number) {
    const url = value[index];
    onChange(value.filter((_, i) => i !== index));
    if (url) void removeImage(url);
  }

  // Cover = first image. Promote the chosen one to the front, keeping the rest in order.
  function makeCover(index: number) {
    if (index === 0) return;
    const next = [...value];
    const [picked] = next.splice(index, 1);
    next.unshift(picked);
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {value.map((url, i) => (
          <div
            key={url}
            className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-border bg-muted"
          >
            <ZoomableImage src={url} fit="contain" className="h-full w-full" />
            {/* First image is the cover/thumbnail. */}
            {i === 0 ? (
              <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-foreground/60 py-0.5 text-[10px] font-medium text-background">
                <Star className="h-3 w-3 fill-current" />
                {t("media.cover")}
              </span>
            ) : (
              !disabled && (
                <button
                  type="button"
                  onClick={() => makeCover(i)}
                  title={t("media.makeCover")}
                  aria-label={t("media.makeCover")}
                  className="absolute start-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow hover:bg-background hover:text-foreground"
                >
                  <Star className="h-3.5 w-3.5" />
                </button>
              )
            )}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={t("media.remove")}
                className="absolute end-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-background/80 text-destructive shadow hover:bg-background"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-muted/40 text-muted-foreground transition hover:bg-muted disabled:opacity-50",
          )}
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          <span className="text-[11px]">{t("media.add")}</span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        className="hidden"
        onChange={onPick}
        disabled={disabled || busy}
      />
      <p className="text-xs text-muted-foreground">{t("media.hint")}</p>
    </div>
  );
}
