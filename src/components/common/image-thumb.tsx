import { ImageIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { ZoomableImage } from "@/components/common/zoomable-image";

/** Small rounded thumbnail for list tables — click to enlarge; placeholder when empty. */
export function ImageThumb({
  src,
  alt = "",
  className,
}: {
  src?: string | null;
  alt?: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground",
          className,
        )}
      >
        <ImageIcon className="h-4 w-4" />
      </div>
    );
  }
  return (
    <ZoomableImage
      src={src}
      alt={alt}
      className={cn("h-9 w-9 rounded-md border border-border", className)}
    />
  );
}
