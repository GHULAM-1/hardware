import { cn } from "@/lib/utils";

/**
 * Qasim Hardware brand lockup. The PNG asset is just the circular "QH" emblem, so
 * the "Qasim Hardware" wordmark is rendered as real text beside it (stays crisp at
 * any size). Reused in the sidebar, topbar, mobile nav and login.
 *
 * `branded` wraps the emblem + wordmark in a white rounded plate so it pops against
 * the blue app chrome (sidebar/topbar). Plain image otherwise — used on the login
 * card (already white) and the collapsed rail.
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
  /** White rounded plate with the emblem + "Qasim Hardware" wordmark (for blue chrome). */
  branded?: boolean;
}) {
  const height = compact || size === "sm" ? "h-9" : size === "lg" ? "h-20" : "h-12";

  if (branded) {
    // Bigger emblem; the wordmark stacks on two lines so it grows without
    // overflowing the fixed-width sidebar header.
    const emblem = compact ? "h-10" : "h-12";
    return (
      <div
        className={cn(
          "flex min-w-0 items-center gap-2 rounded-xl bg-white shadow-md ring-1 ring-black/5",
          compact ? "px-2 py-1" : "px-2.5 py-1.5",
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo_hardware.png"
          alt="Qasim Hardware"
          draggable={false}
          className={cn("w-auto shrink-0 select-none object-contain", emblem)}
        />
        <span
          className={cn(
            "flex min-w-0 flex-col font-extrabold uppercase leading-[1.05] tracking-tight text-ink",
            compact ? "text-xs" : "text-sm",
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
