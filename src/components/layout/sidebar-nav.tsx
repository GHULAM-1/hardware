"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ChevronRight, Lock, LockOpen } from "lucide-react";

import { NAV_ITEMS, type GameColor } from "@/lib/nav";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { useLock } from "@/providers/lock-provider";
import { useNavShortcutSettings, useLockedTabs } from "@/hooks/use-settings";
import { Icon3D } from "@/components/ui/icon-3d";
import { ShortcutHint } from "@/components/layout/shortcut-hint";
import { cn } from "@/lib/utils";

const CANDY: Record<GameColor, string> = {
  green: "candy-green",
  blue: "candy-blue",
  orange: "candy-orange",
  purple: "candy-purple",
  red: "candy-red",
  teal: "candy-teal",
  pink: "candy-pink",
  slate: "candy-slate",
};

/** The nav link list — shared by the desktop sidebar and the mobile sheet. */
export function SidebarNav({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const isSuperAdmin = useIsSuperAdmin();
  const { data: shortcuts } = useNavShortcutSettings();
  const { data: lock } = useLockedTabs();
  const lockedTabs = lock?.tabs ?? [];
  const { unlocked } = useLock();

  const items = NAV_ITEMS.filter((i) => isSuperAdmin || i.adminAllowed);

  return (
    <nav className={cn("flex-1 space-y-2 overflow-y-auto", collapsed ? "p-2" : "p-3")}>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const locked = lockedTabs.includes(item.href);
        const label = t(item.i18nKey);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            className={cn(
              "candy candy-lg relative flex h-12 items-center rounded-lg font-bold text-white",
              CANDY[item.color],
              collapsed ? "w-12 justify-center px-1" : "gap-2 ps-1.5 pe-2.5",
              active && "ring-gold",
            )}
          >
            <Icon3D
              name={item.icon3d}
              size={38}
              className="shrink-0 drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]"
            />
            {/* Collapsed: a lock badge on the tile corner (no room for a label).
                Green + open padlock while unlocked this session. */}
            {locked && collapsed && (
              <span
                className={cn(
                  "absolute -end-1 -top-1 inline-flex size-5 items-center justify-center rounded-full shadow ring-2 ring-white/80",
                  unlocked ? "bg-emerald-500 text-white" : "bg-gold text-slate-900",
                )}
                title={unlocked ? t("lock.unlocked") : t("lock.lockedTitle")}
              >
                {unlocked ? (
                  <LockOpen className="size-3" strokeWidth={3} />
                ) : (
                  <Lock className="size-3" strokeWidth={3} />
                )}
              </span>
            )}
            {!collapsed && <span className="flex-1 truncate text-start">{label}</span>}
            {/* Expanded: a lock badge sits before the shortcut hint. */}
            {locked && !collapsed && (
              <span
                className={cn(
                  "inline-flex size-6 shrink-0 items-center justify-center rounded-full shadow ring-2 ring-white/70",
                  unlocked ? "bg-emerald-500 text-white" : "bg-gold text-slate-900",
                )}
                title={unlocked ? t("lock.unlocked") : t("lock.lockedTitle")}
              >
                {unlocked ? (
                  <LockOpen className="size-3.5" strokeWidth={3} />
                ) : (
                  <Lock className="size-3.5" strokeWidth={3} />
                )}
              </span>
            )}
            {!collapsed && (
              <ShortcutHint
                letter={shortcuts?.[item.href] ?? item.shortcut}
                className="hidden shrink-0 md:inline-flex"
              />
            )}
            {active && !collapsed && (
              <ChevronRight className="size-5 shrink-0 text-gold drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)] rtl:rotate-180" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
