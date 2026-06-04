"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { NAV_ITEMS } from "@/lib/nav";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

/** The nav link list — shared by the desktop sidebar and the mobile sheet. */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const isSuperAdmin = useIsSuperAdmin();

  const items = NAV_ITEMS.filter((i) => !i.superAdminOnly || isSuperAdmin);

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="truncate">{t(item.i18nKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
