"use client";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

/** A titled panel used to frame each chart on the dashboard. */
export function ChartCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col gap-4 p-5", className)}>
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      {children}
    </Card>
  );
}

export type BarPoint = { label: string; value: number; valueLabel?: string };

/**
 * Lightweight vertical bar chart — pure flexbox, no chart library. Responsive
 * (bars flex to fill width), dark-mode safe (theme tokens), and accessible
 * (each bar exposes its value via title + an always-visible label on ≥sm).
 */
export function BarChart({ data }: { data: BarPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    // items-stretch makes every column full height, so the inner flex-1 "track"
    // has a definite height for the bar's percentage height to resolve against.
    <div className="flex h-48 items-stretch gap-2 sm:gap-4">
      {data.map((d, i) => (
        <div key={i} className="group flex flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-md bg-primary/70 transition-all group-hover:bg-primary"
              style={{ height: `${d.value > 0 ? Math.max((d.value / max) * 100, 4) : 0}%` }}
              title={`${d.label}: ${d.valueLabel ?? d.value}`}
            />
          </div>
          <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
            {d.valueLabel ?? d.value}
          </span>
          <span className="text-xs text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export type Segment = { label: string; value: number; valueLabel?: string; tone: string };

const toneBar: Record<string, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  primary: "bg-primary",
  brand: "bg-brand",
};

/**
 * A proportion bar + legend — for breakdowns like payment mix or stock health.
 * Falls back to an "all zero" empty state so it never renders a blank bar.
 */
export function SegmentBar({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-3 overflow-hidden rounded-full bg-muted">
        {total > 0 &&
          segments.map((s, i) =>
            s.value > 0 ? (
              <div
                key={i}
                className={cn("h-full", toneBar[s.tone])}
                style={{ width: `${(s.value / total) * 100}%` }}
                title={`${s.label}: ${s.valueLabel ?? s.value}`}
              />
            ) : null,
          )}
      </div>
      <ul className="space-y-1.5">
        {segments.map((s, i) => (
          <li key={i} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", toneBar[s.tone])} />
              {s.label}
            </span>
            <span className="tabular-nums text-muted-foreground">{s.valueLabel ?? s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
