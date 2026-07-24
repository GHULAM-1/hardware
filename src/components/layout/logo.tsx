import { cn } from "@/lib/utils";

/**
 * Qasim Hardware brand lockup.
 *
 * NOTE ON THE ASSET: `logo_hardware.png` has the "QASIM HARDWARE" wordmark baked
 * in underneath the medallion. This component used to render that whole image AND
 * a text wordmark beside it, so the name appeared twice and the medallion was
 * squeezed to fit the plate. `logo_emblem.png` is the same art cropped to the
 * medallion alone, leaving the wordmark to real text — which stays crisp at any
 * size and can be styled to match the rest of the UI.
 *
 * `branded` mounts the lockup on a light candy plate so it reads as part of the
 * game-style chrome rather than a flat white sticker. Plain image otherwise —
 * used on the login card and the collapsed rail.
 */
export function Logo({
  className,
  compact = false,
  size = "md",
  branded = false,
}: {
  className?: string;
  compact?: boolean;
  /** Visual size — `sm` (compact), `md` (chrome), `lg` (login hero). */
  size?: "sm" | "md" | "lg";
  /** Candy plate with the medallion + "Qasim Hardware" wordmark (for blue chrome). */
  branded?: boolean;
}) {
  const height = compact || size === "sm" ? "h-9" : size === "lg" ? "h-20" : "h-12";

  if (branded) {
    return (
      <div
        className={cn(
          "candy candy-cream candy-sm flex min-w-0 items-center gap-2 rounded-xl",
          compact ? "px-1.5 py-1" : "px-2 py-1.5",
          className,
        )}
      >
        {/* Medallion straight onto the plate — a nested white disc just boxed the
            circular mark inside a second circle and bulked the whole lockup out. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo_emblem.png"
          alt="Qasim Hardware"
          draggable={false}
          className={cn(
            "w-auto shrink-0 select-none object-contain",
            compact ? "h-8" : "h-10",
          )}
        />
        <span
          className={cn(
            "flex min-w-0 flex-col font-extrabold uppercase leading-[1.05] tracking-tight text-brand-red",
            compact ? "text-[11px]" : "text-xs",
          )}
        >
          <span className="truncate">Qasim</span>
          <span className="truncate">Hardware</span>
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo_hardware.png"
        alt="Qasim Hardware"
        draggable={false}
        className={cn("w-auto select-none object-contain", height)}
      />
    </div>
  );
}
