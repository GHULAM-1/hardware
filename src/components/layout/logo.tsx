import { cn } from "@/lib/utils";

/**
 * Qasim Hardware brand lockup (circular "QH" emblem + wordmark). Reused in the
 * sidebar, mobile topbar and login. The PNG has a transparent background, so it
 * sits cleanly on both the blue app chrome and the white login card. `compact`
 * renders it smaller for the mobile topbar.
 */
export function Logo({
  className,
  compact = false,
  size = "md",
}: {
  className?: string;
  compact?: boolean;
  /** Visual size — `sm` (compact), `md` (chrome), `lg` (login hero). */
  size?: "sm" | "md" | "lg";
}) {
  const height = compact || size === "sm" ? "h-9" : size === "lg" ? "h-20" : "h-12";
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
