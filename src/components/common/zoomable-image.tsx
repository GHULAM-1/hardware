"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * A thumbnail that opens a larger lightbox view of the image on click. Used for
 * the upload preview and list thumbnails. Clicks don't bubble (so it won't also
 * trigger a row's onClick).
 */
export function ZoomableImage({
  src,
  alt = "",
  className,
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        title={t("media.viewImage")}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={cn("block overflow-hidden", className)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-xl p-2">
          <DialogTitle className="sr-only">{alt || t("media.viewImage")}</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="max-h-[80vh] w-full rounded-md object-contain" />
        </DialogContent>
      </Dialog>
    </>
  );
}
