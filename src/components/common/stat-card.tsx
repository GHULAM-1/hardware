import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Each tone is a full candy family, so a stat row reads as a row of colored
 * blocks rather than identical white slabs. `.candy-*` sets the --top/--base/
 * --ledge trio that `.panel` (on Card) paints with.
 */
const toneClasses: Record<string, string> = {
  primary: "candy-blue",
  brand: "candy-blue",
  success: "candy-green",
  warning: "candy-orange",
  danger: "candy-red",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tone?: keyof typeof toneClasses;
}) {
  return (
    <Card className={cn("flex flex-row items-center gap-4 p-5", toneClasses[tone])}>
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/22 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_2px_0_rgba(0,0,0,0.22)]">
        <Icon className="h-6 w-6" strokeWidth={2.5} />
      </span>
      <div>
        <p className="text-sm font-bold text-white/85">{label}</p>
        <p className="ink-pop-lg text-2xl font-extrabold tabular-nums text-white">{value}</p>
      </div>
    </Card>
  );
}
