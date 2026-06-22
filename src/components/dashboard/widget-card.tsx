"use client";

import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Icon3D, type Icon3DName } from "@/components/ui/icon-3d";
import { cn } from "@/lib/utils";

const toneClasses: Record<string, string> = {
  primary: "bg-primary/15 text-primary",
  brand: "bg-brand/15 text-brand",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/15 text-destructive",
};

/**
 * A dashboard KPI tile that links to its full page. Used for the widget grid so
 * each metric doubles as a way to navigate (deep-link) into the relevant module.
 */
export function WidgetCard({
  label,
  value,
  icon: Icon,
  icon3d,
  tone = "primary",
  href,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  /** When set, shows the glossy 3D icon instead of the tinted lucide glyph. */
  icon3d?: Icon3DName;
  tone?: keyof typeof toneClasses;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="relative flex h-full flex-row items-center gap-4 p-5 transition group-hover:border-primary/40 group-hover:shadow-md">
        {icon3d ? (
          <Icon3D name={icon3d} size={52} className="shrink-0 drop-shadow-[0_3px_5px_rgba(0,0,0,0.22)]" />
        ) : (
          <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-lg", toneClasses[tone])}>
            <Icon className="h-6 w-6" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate pe-6 text-sm text-muted-foreground">{label}</p>
          <div className="truncate text-xl font-bold tabular-nums sm:text-2xl">{value}</div>
        </div>
        <ArrowRight className="absolute end-4 top-4 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 rtl:rotate-180" />
      </Card>
    </Link>
  );
}
