"use client";

import { LayoutGrid, List } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

export type ListView = "list" | "grid";

/** Segmented list/grid switch for list pages. Controlled; parent owns persistence. */
export function ViewToggle({
  value,
  onChange,
  className,
}: {
  value: ListView;
  onChange: (v: ListView) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const options: { key: ListView; icon: typeof List; label: string }[] = [
    { key: "list", icon: List, label: t("common.listView") },
    { key: "grid", icon: LayoutGrid, label: t("common.gridView") },
  ];
  return (
    <div
      className={cn(
        // Inset themed "well" with a raised gold active — matches the Sort/Filter
        // controls and the pager, not the old translucent bg-muted bar.
        "well inline-flex h-9 shrink-0 items-center gap-1 rounded-lg p-1",
        className,
      )}
      role="group"
    >
      {options.map(({ key, icon: Icon, label }) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={active}
            aria-label={label}
            title={label}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_0_rgba(0,0,0,0.3)]"
                : "text-white/80 hover:bg-white/15 hover:text-white",
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
