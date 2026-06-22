"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";

import { NAV_ITEMS, type GameColor } from "@/lib/nav";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { Icon3D } from "@/components/ui/icon-3d";
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

  const items = NAV_ITEMS.filter((i) => isSuperAdmin || i.adminAllowed);

  return (
    <nav className={cn("flex-1 space-y-2 overflow-y-auto", collapsed ? "p-2" : "p-3")}>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const label = t(item.i18nKey);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            className={cn(
              "candy candy-lg flex h-12 items-center rounded-lg font-bold text-white",
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
            {!collapsed && <span className="flex-1 truncate text-start">{label}</span>}
            {active && !collapsed && (
              <ChevronRight className="size-5 shrink-0 text-gold drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)] rtl:rotate-180" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
