import { Store } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Red "candy" storefront plaque + wordmark. Reused in the sidebar, mobile topbar
 * and login. The wordmark inherits the parent text color (white on the blue chrome,
 * ink inside the white login card), so it stays legible everywhere.
 */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="candy candy-red flex h-10 w-10 items-center justify-center rounded-xl border-2 border-gold text-white">
        <Store className="h-5 w-5" />
      </span>
      {!compact && (
        <span className="leading-[1.05]">
          <span className="block text-sm font-extrabold tracking-wide text-current">LAHORE</span>
          <span className="block text-sm font-extrabold tracking-wide text-gold">HARDWARE</span>
          <span className="block text-[9px] leading-tight tracking-[0.3em] text-gold">★★★★★</span>
        </span>
      )}
    </div>
  );
}
