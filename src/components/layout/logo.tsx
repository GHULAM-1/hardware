import { Hexagon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Amber hexagon brand mark + wordmark. Reused in the sidebar and login. */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Hexagon className="h-5 w-5 fill-current" />
      </span>
      {!compact && (
        <span className="text-sm font-bold leading-tight tracking-tight">
          HARDWARE SHOP
          <span className="block text-primary">CRM</span>
        </span>
      )}
    </div>
  );
}
