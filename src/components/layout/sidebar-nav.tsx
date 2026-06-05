"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { NAV_ITEMS } from "@/lib/nav";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

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
    <nav className={cn("flex-1 space-y-1 overflow-y-auto", collapsed ? "p-2" : "p-3")}>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        const label = t(item.i18nKey);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            className={cn(
              "flex items-center rounded-md text-sm font-medium transition-colors",
              collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
