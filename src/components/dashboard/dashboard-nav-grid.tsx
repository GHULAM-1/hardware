"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Lock, LockOpen } from "lucide-react";

import { NAV_ITEMS, type GameColor } from "@/lib/nav";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { useLock } from "@/providers/lock-provider";
import { useNavShortcutSettings, useLockedTabs } from "@/hooks/use-settings";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { DialogKey } from "@/lib/dialog-keys";
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

/**
 * The dashboard launcher grid — one big candy tile per nav route (the dashboard's
 * own entry is dropped; you're already here). Shares the nav source of truth and
 * the candy colour map with the sidebar so routes/colours live in one place.
 * Reused by the mobile nav drawer.
 */
export function DashboardNavGrid({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const isSuperAdmin = useIsSuperAdmin();
  const { data: shortcuts } = useNavShortcutSettings();
  const { data: lock } = useLockedTabs();
  const lockedTabs = lock?.tabs ?? [];
  const { isTabUnlocked } = useLock();
  const { openDialog } = useDialogManager();

  const items = NAV_ITEMS.filter(
    (i) => i.href !== "/dashboard" && (isSuperAdmin || i.adminAllowed),
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        const locked = lockedTabs.includes(item.href);
        const unlocked = isTabUnlocked(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "candy candy-lg relative flex flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-3 text-center font-bold text-white",
              CANDY[item.color],
              active && "ring-gold",
            )}
          >
            {locked && (
              <span
                className={cn(
                  "absolute start-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full shadow-md ring-2 ring-white/80",
                  unlocked ? "bg-emerald-500 text-white" : "bg-gold text-slate-900",
                )}
                title={unlocked ? t("lock.unlocked") : t("lock.lockedTitle")}
              >
                {unlocked ? (
                  <LockOpen className="size-[18px]" strokeWidth={2.75} />
                ) : (
                  <Lock className="size-[18px]" strokeWidth={2.75} />
                )}
              </span>
            )}
            <ShortcutHint
              letter={shortcuts?.[item.href] ?? item.shortcut}
              className="absolute end-2 top-2 hidden md:inline-flex"
            />
            <Icon3D
              name={item.icon3d}
              size={48}
              className="drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]"
            />
            <span className="line-clamp-2 text-sm leading-tight">{t(item.i18nKey)}</span>
          </Link>
        );
      })}

      {/* Quick item search — an action tile (opens a dialog), not a route. */}
      <button
        type="button"
        onClick={() => {
          openDialog(DialogKey.ItemQuickSearch, null);
          onNavigate?.();
        }}
        className={cn(
          "candy candy-lg relative flex flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-3 text-center font-bold text-white",
          CANDY.red,
        )}
      >
        <Icon3D
          name="search"
          size={48}
          className="drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]"
        />
        <span className="line-clamp-2 text-sm leading-tight">{t("quickSearch.title")}</span>
      </button>
    </div>
  );
}
