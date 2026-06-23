"use client";

import * as React from "react";
import { Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const PERIODS = ["AM", "PM"] as const;
type Period = (typeof PERIODS)[number];

/** One scrollable column of options; auto-scrolls the selected row into view on open. */
function Column<T extends string | number>({
  items,
  selected,
  render,
  onSelect,
  open,
  className,
}: {
  items: readonly T[];
  selected: T | null;
  render: (v: T) => string;
  onSelect: (v: T) => void;
  open: boolean;
  className?: string;
}) {
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (open) ref.current?.scrollIntoView({ block: "center" });
  }, [open]);

  return (
    <ScrollArea className={cn("h-56", className)}>
      <div className="flex flex-col gap-0.5 p-1.5">
        {items.map((it) => {
          const isSel = it === selected;
          return (
            <button
              key={String(it)}
              ref={isSel ? ref : undefined}
              type="button"
              onClick={() => onSelect(it)}
              className={cn(
                "rounded-md px-3 py-1.5 text-center text-sm font-semibold tabular-nums transition-colors",
                isSel ? "bg-primary text-primary-foreground" : "hover:bg-accent",
              )}
            >
              {render(it)}
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

/**
 * A shadcn time picker: an outline trigger (matching DatePicker) that opens a
 * Popover with hour / minute / AM–PM columns. Value is a 24-hour "HH:MM" string.
 */
export function TimePicker({
  value,
  onChange,
  disabled,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);

  const has = /^\d{1,2}:\d{2}/.test(value || "");
  const h24 = has ? Number(value.split(":")[0]) : null;
  const min = has ? Number(value.split(":")[1]) : null;
  const hour12 = h24 == null ? null : h24 % 12 || 12;
  const period: Period = h24 == null || h24 < 12 ? "AM" : "PM";

  const commit = (h12: number, m: number, p: Period) => {
    const h = p === "PM" ? (h12 % 12) + 12 : h12 % 12;
    onChange(`${pad(h)}:${pad(m)}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start font-normal",
            h24 == null && "text-muted-foreground",
            className,
          )}
        >
          <Clock className="me-2 h-4 w-4" />
          {h24 == null ? "--:--" : formatTime(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex divide-x divide-border" dir="ltr">
          <Column
            items={HOURS}
            selected={hour12}
            render={pad}
            onSelect={(v) => commit(v, min ?? 0, period)}
            open={open}
            className="w-16"
          />
          <Column
            items={MINUTES}
            selected={min}
            render={pad}
            onSelect={(v) => commit(hour12 ?? 12, v, period)}
            open={open}
            className="w-16"
          />
          <Column
            items={PERIODS}
            selected={h24 == null ? null : period}
            render={(v) => v}
            onSelect={(v) => commit(hour12 ?? 12, min ?? 0, v)}
            open={open}
            className="w-16"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
