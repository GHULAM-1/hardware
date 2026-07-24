import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "danger" | "info" | "muted";

/**
 * Solid candy chips. The previous `/15` tint + same-hue text washed out to
 * nothing once panels became saturated color blocks — a badge has to out-punch
 * its background, so each tone is now a full gradient pill with white text.
 */
const toneClasses: Record<StatusTone, string> = {
  success: "candy candy-sm candy-green text-white",
  warning: "candy candy-sm candy-orange text-white",
  danger: "candy candy-sm candy-red text-white",
  info: "candy candy-sm candy-blue text-white",
  muted: "candy candy-sm candy-slate text-white",
};

/** Generic pill badge. Callers map a domain status → tone + label. */
export function StatusBadge({
  tone,
  label,
  className,
}: {
  tone: StatusTone;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-extrabold",
        toneClasses[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
